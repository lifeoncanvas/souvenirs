package com.licht.souvenirs.web;

import com.licht.souvenirs.domain.Review;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.OrderItemRepository;
import com.licht.souvenirs.repo.Repositories.ProductRepository;
import com.licht.souvenirs.repo.Repositories.ReviewRepository;
import com.licht.souvenirs.repo.Repositories.UserRepository;
import com.licht.souvenirs.security.AuthUser;
import com.licht.souvenirs.service.CatalogService;
import com.licht.souvenirs.service.CatalogService.ProductQuery;
import com.licht.souvenirs.service.Mapper;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CatalogController {
    private final CatalogService catalog;
    private final ProductRepository products;
    private final ReviewRepository reviews;
    private final UserRepository users;
    private final Mapper mapper;
    private final OrderItemRepository orderItems;

    public CatalogController(CatalogService catalog, ProductRepository products, ReviewRepository reviews,
                             UserRepository users, Mapper mapper, OrderItemRepository orderItems) {
        this.catalog = catalog;
        this.products = products;
        this.reviews = reviews;
        this.users = users;
        this.mapper = mapper;
        this.orderItems = orderItems;
    }

    @GetMapping("/products")
    public PageResponse<ProductSummary> list(@RequestParam(required = false) String q,
                                             @RequestParam(required = false) String category,
                                             @RequestParam(required = false) BigDecimal minPrice,
                                             @RequestParam(required = false) BigDecimal maxPrice,
                                             @RequestParam(required = false) Boolean inStock,
                                             @RequestParam(required = false) Boolean personalisable,
                                             @RequestParam(defaultValue = "featured") String sort,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "12") int size,
                                             HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        return catalog.search(new ProductQuery(q, category, minPrice, maxPrice, inStock, personalisable, sort, page,
                size, false));
    }

    @GetMapping("/products/price-range")
    public PriceRange priceRange(HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
        return catalog.priceRange();
    }

    @GetMapping("/products/{slug}")
    public ProductDetail get(@PathVariable String slug, HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
        return catalog.bySlug(slug, false);
    }

    @GetMapping("/products/{slug}/related")
    public List<ProductSummary> related(@PathVariable String slug, @RequestParam(defaultValue = "4") int limit,
                                        HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=600");
        return catalog.related(slug, Math.min(limit, 12));
    }

    @GetMapping("/categories")
    public List<CategoryDto> categories(HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=900");
        return catalog.categories();
    }

    @GetMapping("/products/{slug}/reviews")
    @Transactional(readOnly = true)
    public List<ReviewDto> reviews(@PathVariable String slug) {
        var p = products.findBySlug(slug).orElseThrow(() -> ApiException.notFound("Product"));
        return reviews.findByProductIdAndApprovedTrueOrderByCreatedAtDesc(p.getId()).stream().map(mapper::review).toList();
    }

    /**
     * Reviews come only from customers with a verified email who bought the piece, and are held for
     * moderation before appearing on the storefront.
     */
    @PostMapping("/products/{slug}/reviews")
    @Transactional
    public ReviewDto addReview(@PathVariable String slug, @Valid @RequestBody ReviewRequest r,
                               @AuthenticationPrincipal AuthUser me) {
        var p = products.findBySlug(slug).filter(x -> x.isActive()).orElseThrow(() -> ApiException.notFound("Product"));
        var author = users.findById(me.id()).orElseThrow(() -> ApiException.notFound("Account"));
        if (!author.isEmailVerified()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Please verify your email address before writing a review.");
        }
        if (!orderItems.hasPurchased(me.id(), p.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Reviews are open to customers who have purchased this piece.");
        }
        if (reviews.findByProductIdAndUserId(p.getId(), me.id()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "You have already reviewed this piece.");
        }
        Review rv = new Review();
        rv.setProduct(p);
        rv.setUser(author);
        rv.setRating(r.rating());
        rv.setTitle(r.title());
        rv.setBody(r.body());
        rv.setApproved(false);
        reviews.save(rv);
        return mapper.review(rv);
    }
}
