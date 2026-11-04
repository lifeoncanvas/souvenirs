package com.licht.souvenirs.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.licht.souvenirs.domain.*;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.*;
import com.licht.souvenirs.service.*;
import com.licht.souvenirs.service.CatalogService.ProductQuery;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

/** Admin dashboard API. Every route requires ROLE_ADMIN (see SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final CatalogService catalog;
    private final OrderService orderService;
    private final ContentService content;
    private final StorageService storage;
    private final Mapper mapper;
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final UserRepository users;
    private final AddressRepository addresses;
    private final EnquiryRepository enquiries;
    private final ProductRepository products;
    private final TestimonialRepository testimonials;
    private final FaqRepository faqs;
    private final CouponRepository coupons;
    private final ReviewRepository reviews;
    private final NewsletterRepository newsletter;
    private final PayPalCheckoutService paypalCheckout;

    public AdminController(CatalogService catalog, OrderService orderService, ContentService content,
                           StorageService storage, Mapper mapper, OrderRepository orders,
                           OrderItemRepository orderItems, UserRepository users, AddressRepository addresses,
                           EnquiryRepository enquiries, ProductRepository products,
                           TestimonialRepository testimonials, FaqRepository faqs, CouponRepository coupons,
                           ReviewRepository reviews, NewsletterRepository newsletter,
                           PayPalCheckoutService paypalCheckout) {
        this.catalog = catalog;
        this.orderService = orderService;
        this.content = content;
        this.storage = storage;
        this.mapper = mapper;
        this.orders = orders;
        this.orderItems = orderItems;
        this.users = users;
        this.addresses = addresses;
        this.enquiries = enquiries;
        this.products = products;
        this.testimonials = testimonials;
        this.faqs = faqs;
        this.coupons = coupons;
        this.reviews = reviews;
        this.newsletter = newsletter;
        this.paypalCheckout = paypalCheckout;
    }

    // ---------- Dashboard ----------

    @GetMapping("/dashboard")
    @Transactional(readOnly = true)
    public DashboardDto dashboard() {
        long customers = users.findAll().stream().filter(u -> !u.isAdmin()).count();
        List<BestsellerRow> best = orderItems.bestsellers(PageRequest.of(0, 5)).stream()
                .map(r -> new BestsellerRow((String) r[0], ((Number) r[1]).longValue(), (BigDecimal) r[2])).toList();
        List<OrderDto> recent = orders.findAll(PageRequest.of(0, 6, Sort.by("createdAt").descending()))
                .map(mapper::order).getContent();
        return new DashboardDto(orders.count(), orders.paidRevenue(),
                orders.countByStatusIn(List.of(Order.Status.PENDING, Order.Status.CONFIRMED, Order.Status.IN_PRODUCTION)),
                orders.countByStatus(Order.Status.DELIVERED), customers,
                enquiries.countByStatus(Enquiry.Status.NEW), products.countByActiveTrue(), best, recent);
    }

    // ---------- Products & categories ----------

    @GetMapping("/products")
    public PageResponse<ProductSummary> products(@RequestParam(required = false) String q,
                                                 @RequestParam(required = false) String category,
                                                 @RequestParam(defaultValue = "newest") String sort,
                                                 @RequestParam(defaultValue = "0") int page,
                                                 @RequestParam(defaultValue = "20") int size) {
        return catalog.search(new ProductQuery(q, category, null, null, null, null, sort, page, size, true));
    }

    @GetMapping("/products/{id}")
    public ProductDetail product(@PathVariable Long id) {
        return catalog.byId(id);
    }

    @PostMapping("/products")
    public ProductDetail createProduct(@Valid @RequestBody ProductRequest r) {
        return catalog.save(null, r);
    }

    @PutMapping("/products/{id}")
    public ProductDetail updateProduct(@PathVariable Long id, @Valid @RequestBody ProductRequest r) {
        return catalog.save(id, r);
    }

    @DeleteMapping("/products/{id}")
    public void deleteProduct(@PathVariable Long id) {
        catalog.delete(id);
    }

    @PostMapping("/categories")
    public CategoryDto createCategory(@Valid @RequestBody CategoryRequest r) {
        return catalog.saveCategory(null, r);
    }

    @PutMapping("/categories/{id}")
    public CategoryDto updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest r) {
        return catalog.saveCategory(id, r);
    }

    @DeleteMapping("/categories/{id}")
    public void deleteCategory(@PathVariable Long id) {
        catalog.deleteCategory(id);
    }

    @PostMapping(value = "/uploads", consumes = "multipart/form-data")
    public List<UploadResponse> upload(@RequestParam("files") List<MultipartFile> files,
                                       @RequestParam(defaultValue = "products") String folder) {
        if (files.size() > 12) throw ApiException.badRequest("Upload up to 12 images at a time.");
        return files.stream().map(f -> new UploadResponse(storage.storeImage(f, folder))).toList();
    }

    // ---------- Orders ----------

    @GetMapping("/orders")
    public PageResponse<OrderDto> orders(@RequestParam(required = false) String q,
                                         @RequestParam(required = false) String status,
                                         @RequestParam(required = false) String paymentStatus,
                                         @RequestParam(defaultValue = "0") int page,
                                         @RequestParam(defaultValue = "20") int size) {
        return orderService.adminList(q, status, paymentStatus, page, size);
    }

    @GetMapping("/orders/{id}")
    public OrderDto order(@PathVariable Long id) {
        return orderService.adminGet(id);
    }

    @PatchMapping("/orders/{id}")
    public OrderDto updateOrder(@PathVariable Long id, @Valid @RequestBody OrderUpdateRequest r) {
        return orderService.adminUpdate(id, r);
    }

    /** Refunds the order's PayPal payment in full and marks it refunded. */
    @PostMapping("/orders/{id}/refund")
    public OrderDto refundOrder(@PathVariable Long id) {
        return paypalCheckout.refund(id);
    }

    // ---------- Enquiries ----------

    @GetMapping("/enquiries")
    @Transactional(readOnly = true)
    public PageResponse<EnquiryDto> enquiries(@RequestParam(required = false) String type,
                                              @RequestParam(required = false) String status,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "20") int size) {
        List<Specification<Enquiry>> parts = new ArrayList<>();
        if (type != null && !type.isBlank()) {
            Enquiry.Type t = ApiException.parseEnum(Enquiry.Type.class, type, "enquiry type");
            parts.add((r, cq, cb) -> cb.equal(r.get("type"), t));
        }
        if (status != null && !status.isBlank()) {
            Enquiry.Status st = ApiException.parseEnum(Enquiry.Status.class, status, "enquiry status");
            parts.add((r, cq, cb) -> cb.equal(r.get("status"), st));
        }
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            parts.add((r, cq, cb) -> cb.or(cb.like(cb.lower(r.get("fullName")), like),
                    cb.like(cb.lower(r.get("email")), like), cb.like(cb.lower(r.get("companyName")), like)));
        }
        Page<Enquiry> p = enquiries.findAll(Specification.allOf(parts),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return new PageResponse<>(p.getContent().stream().map(mapper::enquiry).toList(), p.getNumber(), p.getSize(),
                p.getTotalElements(), p.getTotalPages());
    }

    @PatchMapping("/enquiries/{id}")
    @Transactional
    public EnquiryDto updateEnquiry(@PathVariable Long id, @Valid @RequestBody EnquiryUpdateRequest r) {
        Enquiry e = enquiries.findById(id).orElseThrow(() -> ApiException.notFound("Enquiry"));
        if (r.status() != null) e.setStatus(Enquiry.Status.valueOf(r.status()));
        if (r.internalNotes() != null) e.setInternalNotes(r.internalNotes());
        return mapper.enquiry(e);
    }

    @DeleteMapping("/enquiries/{id}")
    @Transactional
    public void deleteEnquiry(@PathVariable Long id) {
        enquiries.deleteById(id);
    }

    // ---------- Customers ----------

    @GetMapping("/customers")
    @Transactional(readOnly = true)
    public PageResponse<CustomerDto> customers(@RequestParam(defaultValue = "") String q,
                                               @RequestParam(defaultValue = "0") int page,
                                               @RequestParam(defaultValue = "20") int size) {
        Map<Long, Long> counts = new HashMap<>();
        orders.orderCountsByUser().forEach(r -> counts.put((Long) r[0], ((Number) r[1]).longValue()));
        Page<User> p = users.search(q.trim(),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return new PageResponse<>(p.getContent().stream().map(u -> customer(u, counts.getOrDefault(u.getId(), 0L))).toList(),
                p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages());
    }

    @GetMapping("/customers/{id}")
    @Transactional(readOnly = true)
    public CustomerDetail customerDetail(@PathVariable Long id) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("Customer"));
        List<OrderDto> list = orders.findByUserIdOrderByCreatedAtDesc(id).stream().map(mapper::order).toList();
        return new CustomerDetail(customer(u, list.size()),
                addresses.findByUserIdOrderByDefaultAddressDescIdAsc(id).stream().map(mapper::address).toList(), list);
    }

    @PatchMapping("/customers/{id}")
    @Transactional
    public CustomerDto setCustomerEnabled(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("Customer"));
        if (u.isAdmin()) throw ApiException.badRequest("Administrator accounts cannot be disabled here.");
        if (body.containsKey("enabled")) u.setEnabled(Boolean.TRUE.equals(body.get("enabled")));
        return customer(u, orders.findByUserIdOrderByCreatedAtDesc(id).size());
    }

    private static CustomerDto customer(User u, long orderCount) {
        return new CustomerDto(u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.getPhone(),
                u.isEmailVerified(), u.isEnabled(), orderCount, u.getCreatedAt());
    }

    // ---------- Content ----------

    @PutMapping("/content/{key}")
    public JsonNode putContent(@PathVariable String key, @RequestBody JsonNode value) {
        return content.put(key, value);
    }

    @GetMapping("/testimonials")
    @Transactional(readOnly = true)
    public List<TestimonialDto> testimonials() {
        return testimonials.findAllByOrderBySortOrderAscIdAsc().stream().map(mapper::testimonial).toList();
    }

    @PostMapping("/testimonials")
    @Transactional
    public TestimonialDto createTestimonial(@Valid @RequestBody TestimonialDto r) {
        return saveTestimonial(new Testimonial(), r);
    }

    @PutMapping("/testimonials/{id}")
    @Transactional
    public TestimonialDto updateTestimonial(@PathVariable Long id, @Valid @RequestBody TestimonialDto r) {
        return saveTestimonial(testimonials.findById(id).orElseThrow(() -> ApiException.notFound("Testimonial")), r);
    }

    @DeleteMapping("/testimonials/{id}")
    @Transactional
    public void deleteTestimonial(@PathVariable Long id) {
        testimonials.deleteById(id);
    }

    private TestimonialDto saveTestimonial(Testimonial t, TestimonialDto r) {
        t.setAuthorName(r.authorName());
        t.setOccasion(r.occasion());
        t.setQuote(r.quote());
        t.setRating(r.rating());
        t.setActive(r.active());
        t.setPlaceholder(r.placeholder());
        t.setSortOrder(r.sortOrder());
        return mapper.testimonial(testimonials.save(t));
    }

    @GetMapping("/faqs")
    @Transactional(readOnly = true)
    public List<FaqDto> faqs() {
        return faqs.findAllByOrderBySortOrderAscIdAsc().stream().map(mapper::faq).toList();
    }

    @PostMapping("/faqs")
    @Transactional
    public FaqDto createFaq(@Valid @RequestBody FaqDto r) {
        return saveFaq(new Faq(), r);
    }

    @PutMapping("/faqs/{id}")
    @Transactional
    public FaqDto updateFaq(@PathVariable Long id, @Valid @RequestBody FaqDto r) {
        return saveFaq(faqs.findById(id).orElseThrow(() -> ApiException.notFound("FAQ")), r);
    }

    @DeleteMapping("/faqs/{id}")
    @Transactional
    public void deleteFaq(@PathVariable Long id) {
        faqs.deleteById(id);
    }

    private FaqDto saveFaq(Faq f, FaqDto r) {
        f.setCategory(r.category());
        f.setQuestion(r.question());
        f.setAnswer(r.answer());
        f.setSortOrder(r.sortOrder());
        f.setActive(r.active());
        return mapper.faq(faqs.save(f));
    }

    // ---------- Coupons ----------

    @GetMapping("/coupons")
    @Transactional(readOnly = true)
    public List<CouponDto> coupons() {
        return coupons.findAll(Sort.by("createdAt").descending()).stream().map(mapper::coupon).toList();
    }

    @PostMapping("/coupons")
    @Transactional
    public CouponDto createCoupon(@Valid @RequestBody CouponDto r) {
        if (coupons.findByCodeIgnoreCase(r.code()).isPresent()) throw ApiException.badRequest("That code already exists.");
        return saveCoupon(new Coupon(), r);
    }

    @PutMapping("/coupons/{id}")
    @Transactional
    public CouponDto updateCoupon(@PathVariable Long id, @Valid @RequestBody CouponDto r) {
        Coupon c = coupons.findById(id).orElseThrow(() -> ApiException.notFound("Coupon"));
        coupons.findByCodeIgnoreCase(r.code()).filter(x -> !x.getId().equals(id))
                .ifPresent(x -> { throw ApiException.badRequest("That code already exists."); });
        return saveCoupon(c, r);
    }

    @DeleteMapping("/coupons/{id}")
    @Transactional
    public void deleteCoupon(@PathVariable Long id) {
        coupons.deleteById(id);
    }

    private CouponDto saveCoupon(Coupon c, CouponDto r) {
        if ("PERCENT".equals(r.type()) && r.amount().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw ApiException.badRequest("A percentage discount cannot exceed 100.");
        }
        c.setCode(r.code().trim().toUpperCase());
        c.setType(Coupon.Type.valueOf(r.type()));
        c.setAmount(r.amount());
        c.setMinOrderTotal(r.minOrderTotal());
        c.setExpiresAt(r.expiresAt());
        c.setUsageLimit(r.usageLimit());
        c.setActive(r.active());
        return mapper.coupon(coupons.save(c));
    }

    // ---------- Reviews & newsletter ----------

    @GetMapping("/reviews")
    @Transactional(readOnly = true)
    public List<ReviewDto> reviews() {
        return reviews.findAllByOrderByCreatedAtDesc().stream().map(mapper::review).toList();
    }

    @PatchMapping("/reviews/{id}")
    @Transactional
    public ReviewDto moderateReview(@PathVariable Long id, @RequestBody Map<String, Boolean> body) {
        Review r = reviews.findById(id).orElseThrow(() -> ApiException.notFound("Review"));
        r.setApproved(Boolean.TRUE.equals(body.get("approved")));
        return mapper.review(r);
    }

    @DeleteMapping("/reviews/{id}")
    @Transactional
    public void deleteReview(@PathVariable Long id) {
        reviews.deleteById(id);
    }

    @GetMapping("/newsletter")
    @Transactional(readOnly = true)
    public List<Map<String, Object>> subscribers() {
        return newsletter.findAll(Sort.by("createdAt").descending()).stream()
                .map(s -> Map.<String, Object>of("id", s.getId(), "email", s.getEmail(), "active", s.isActive(),
                        "createdAt", s.getCreatedAt()))
                .toList();
    }
}
