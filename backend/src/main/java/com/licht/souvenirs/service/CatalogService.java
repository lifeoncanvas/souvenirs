package com.licht.souvenirs.service;

import com.licht.souvenirs.domain.*;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.CategoryRepository;
import com.licht.souvenirs.repo.Repositories.ProductRepository;
import com.licht.souvenirs.repo.Repositories.ReviewRepository;
import com.licht.souvenirs.web.ApiException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.JoinType;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {
    private final ProductRepository products;
    private final CategoryRepository categories;
    private final ReviewRepository reviews;
    private final Mapper mapper;
    private final EntityManager em;

    public CatalogService(ProductRepository products, CategoryRepository categories, ReviewRepository reviews,
                          Mapper mapper, EntityManager em) {
        this.products = products;
        this.categories = categories;
        this.reviews = reviews;
        this.mapper = mapper;
        this.em = em;
    }

    public record ProductQuery(String q, String category, BigDecimal minPrice, BigDecimal maxPrice,
                               Boolean inStock, Boolean personalisable, String sort, int page, int size,
                               boolean includeInactive) {}

    @Transactional(readOnly = true)
    public PageResponse<ProductSummary> search(ProductQuery query) {
        Page<Product> page = products.findAll(spec(query),
                PageRequest.of(Math.max(query.page(), 0), Math.min(Math.max(query.size(), 1), 60), sort(query.sort())));
        return new PageResponse<>(page.getContent().stream().map(mapper::summary).toList(),
                page.getNumber(), page.getSize(), page.getTotalElements(), page.getTotalPages());
    }

    private Specification<Product> spec(ProductQuery q) {
        List<Specification<Product>> parts = new ArrayList<>();
        parts.add(fetchPersonalisation());
        if (!q.includeInactive()) parts.add((r, cq, cb) -> cb.isTrue(r.get("active")));
        if (q.q() != null && !q.q().isBlank()) {
            String like = "%" + q.q().trim().toLowerCase(Locale.ROOT) + "%";
            parts.add((r, cq, cb) -> cb.or(
                    cb.like(cb.lower(r.get("name")), like),
                    cb.like(cb.lower(r.get("shortDescription")), like),
                    cb.like(cb.lower(r.get("description")), like)));
        }
        if (q.category() != null && !q.category().isBlank() && !"all".equals(q.category())) {
            switch (q.category()) {
                case "new-arrivals" -> parts.add((r, cq, cb) -> cb.isTrue(r.get("newArrival")));
                case "bestsellers" -> parts.add((r, cq, cb) -> cb.isTrue(r.get("bestseller")));
                case "featured" -> parts.add((r, cq, cb) -> cb.isTrue(r.get("featured")));
                default -> parts.add((r, cq, cb) -> {
                    cq.distinct(true);
                    Join<Product, Category> c = r.join("categories", JoinType.INNER);
                    return cb.equal(c.get("slug"), q.category());
                });
            }
        }
        if (q.minPrice() != null) parts.add((r, cq, cb) -> cb.greaterThanOrEqualTo(r.get("price"), q.minPrice()));
        if (q.maxPrice() != null) parts.add((r, cq, cb) -> cb.lessThanOrEqualTo(r.get("price"), q.maxPrice()));
        if (Boolean.TRUE.equals(q.inStock())) parts.add((r, cq, cb) -> cb.greaterThan(r.get("stock"), 0));
        if (Boolean.TRUE.equals(q.personalisable())) parts.add((r, cq, cb) -> {
            var p = r.join("personalisation", JoinType.INNER);
            return cb.isTrue(p.get("enabled"));
        });
        return Specification.allOf(parts);
    }

    /**
     * The inverse one-to-one to ProductPersonalisation is otherwise loaded with one query per product;
     * join-fetch it into the page query instead (skipped for the count query, which cannot fetch).
     */
    private static Specification<Product> fetchPersonalisation() {
        return (r, cq, cb) -> {
            if (cq.getResultType() != Long.class && cq.getResultType() != long.class) {
                r.fetch("personalisation", JoinType.LEFT);
            }
            return null;
        };
    }

    private static Sort sort(String s) {
        if (s == null) s = "featured";
        return switch (s) {
            case "price-asc" -> Sort.by("price").ascending();
            case "price-desc" -> Sort.by("price").descending();
            case "popular" -> Sort.by("soldCount").descending().and(Sort.by("id"));
            case "newest" -> Sort.by("createdAt").descending();
            case "name" -> Sort.by("name").ascending();
            default -> Sort.by(Sort.Order.desc("featured"), Sort.Order.desc("soldCount"), Sort.Order.asc("id"));
        };
    }

    @Transactional(readOnly = true)
    public ProductDetail bySlug(String slug, boolean includeInactive) {
        Product p = products.findBySlug(slug).filter(x -> includeInactive || x.isActive())
                .orElseThrow(() -> ApiException.notFound("Product"));
        return detail(p);
    }

    @Transactional(readOnly = true)
    public ProductDetail byId(Long id) {
        return detail(products.findById(id).orElseThrow(() -> ApiException.notFound("Product")));
    }

    private ProductDetail detail(Product p) {
        List<Object[]> stats = reviews.stats(p.getId());
        Double avg = null;
        long count = 0;
        if (!stats.isEmpty() && stats.get(0)[1] != null) {
            count = ((Number) stats.get(0)[1]).longValue();
            avg = count == 0 ? null : ((Number) stats.get(0)[0]).doubleValue();
        }
        return mapper.detail(p, avg, count);
    }

    /** Products sharing a category with the given one, best sellers first. */
    @Transactional(readOnly = true)
    public List<ProductSummary> related(String slug, int limit) {
        Product p = products.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Product"));
        List<Long> catIds = p.getCategories().stream().map(Category::getId).toList();
        Specification<Product> spec = (r, cq, cb) -> {
            cq.distinct(true);
            var base = cb.and(cb.isTrue(r.get("active")), cb.notEqual(r.get("id"), p.getId()));
            if (catIds.isEmpty()) return base;
            return cb.and(base, r.join("categories").get("id").in(catIds));
        };
        return products.findAll(spec.and(fetchPersonalisation()), PageRequest.of(0, limit, Sort.by("soldCount").descending()))
                .map(mapper::summary).getContent();
    }

    @Transactional(readOnly = true)
    public List<CategoryDto> categories() {
        return categories.findAllByOrderBySortOrderAscNameAsc().stream().map(mapper::category).toList();
    }

    @Transactional(readOnly = true)
    public PriceRange priceRange() {
        BigDecimal min = products.minPrice();
        BigDecimal max = products.maxPrice();
        return new PriceRange(min == null ? BigDecimal.ZERO : min, max == null ? BigDecimal.ZERO : max);
    }

    // ---------- Admin ----------

    @Transactional
    public ProductDetail save(Long id, ProductRequest r) {
        Product p = id == null ? new Product() : products.findById(id).orElseThrow(() -> ApiException.notFound("Product"));
        String slug = slugify(r.slug() == null || r.slug().isBlank() ? r.name() : r.slug());
        if (!slug.equals(p.getSlug())) {
            String candidate = slug;
            int n = 2;
            while (products.existsBySlug(candidate)) candidate = slug + "-" + n++;
            p.setSlug(candidate);
        }
        p.setName(r.name().trim());
        p.setShortDescription(r.shortDescription());
        p.setDescription(r.description());
        p.setSpecifications(r.specifications());
        p.setPrice(r.price());
        p.setCompareAtPrice(r.compareAtPrice());
        p.setStock(r.stock());
        p.setActive(r.active());
        p.setFeatured(r.featured());
        p.setBestseller(r.bestseller());
        p.setNewArrival(r.newArrival());

        p.getCategories().clear();
        if (r.categoryIds() != null) p.getCategories().addAll(new HashSet<>(categories.findAllById(r.categoryIds())));

        if (r.images() != null) {
            p.getImages().clear();
            int i = 0;
            for (ImageDto img : r.images()) {
                if (img.url() == null || img.url().isBlank()) continue;
                p.getImages().add(new ProductImage(p, img.url().trim(), img.altText(), i++));
            }
        }

        PersonalisationDto pd = r.personalisation();
        if (pd == null || !pd.enabled()) {
            p.setPersonalisation(null);
        } else {
            ProductPersonalisation pp = p.getPersonalisation() == null ? new ProductPersonalisation() : p.getPersonalisation();
            pp.setEnabled(true);
            pp.setAllowName(pd.allowName());
            pp.setAllowInitials(pd.allowInitials());
            pp.setAllowDate(pd.allowDate());
            pp.setAllowMessage(pd.allowMessage());
            pp.setAllowLogo(pd.allowLogo());
            pp.setAllowEventDetails(pd.allowEventDetails());
            pp.setAllowInstructions(pd.allowInstructions());
            pp.setMessageMaxLength(pd.messageMaxLength() <= 0 ? 120 : pd.messageMaxLength());
            pp.setExtraCost(pd.extraCost() == null ? BigDecimal.ZERO : pd.extraCost());
            p.setPersonalisation(pp);
        }
        products.save(p);
        return detail(p);
    }

    /**
     * Removes a product from carts, wishlists and reviews, detaches it from past order lines
     * (which keep their name/price snapshot), then deletes it.
     */
    @Transactional
    public void delete(Long id) {
        Product p = products.findById(id).orElseThrow(() -> ApiException.notFound("Product"));
        em.createQuery("delete from CartItem i where i.product.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from WishlistItem w where w.product.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("delete from Review r where r.product.id = :id").setParameter("id", id).executeUpdate();
        em.createQuery("update OrderItem i set i.product = null where i.product.id = :id").setParameter("id", id).executeUpdate();
        products.delete(p);
    }

    @Transactional
    public CategoryDto saveCategory(Long id, CategoryRequest r) {
        Category c = id == null ? new Category() : categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        String slug = slugify(r.slug() == null || r.slug().isBlank() ? r.name() : r.slug());
        if (!slug.equals(c.getSlug()) && categories.existsBySlug(slug)) {
            throw ApiException.badRequest("Another category already uses the URL \"" + slug + "\".");
        }
        c.setSlug(slug);
        c.setName(r.name().trim());
        c.setDescription(r.description());
        c.setImageUrl(r.imageUrl());
        c.setSortOrder(r.sortOrder());
        c.setFeatured(r.featured());
        return mapper.category(categories.save(c));
    }

    @Transactional
    public void deleteCategory(Long id) {
        Category c = categories.findById(id).orElseThrow(() -> ApiException.notFound("Category"));
        products.findAll((r, cq, cb) -> r.join("categories").get("id").in(id))
                .forEach(p -> p.getCategories().remove(c));
        categories.delete(c);
    }

    public static String slugify(String s) {
        String n = Normalizer.normalize(s, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String slug = n.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("(^-|-$)", "");
        if (slug.isEmpty()) throw ApiException.badRequest("Please provide a name containing letters or numbers.");
        return slug.length() > 170 ? slug.substring(0, 170) : slug;
    }
}
