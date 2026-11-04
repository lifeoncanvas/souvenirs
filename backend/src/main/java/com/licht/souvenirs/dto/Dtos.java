package com.licht.souvenirs.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Request and response payloads for the REST API. */
public final class Dtos {
    private Dtos() {}

    // ---------- Auth & account ----------

    public record RegisterRequest(
            @NotBlank @Size(max = 80) String firstName,
            @Size(max = 80) String lastName,
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String password,
            @Size(max = 40) String phone,
            /** Turnstile token; required only when the CAPTCHA is enabled. */
            String captchaToken) {}

    public record LoginRequest(@NotBlank @Email String email, @NotBlank String password) {}

    public record ForgotPasswordRequest(@NotBlank @Email String email, String captchaToken) {}

    public record ResetPasswordRequest(
            @NotBlank String token,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String password) {}

    public record ChangePasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 8, max = 100, message = "must be at least 8 characters") String newPassword) {}

    public record ProfileUpdate(
            @NotBlank @Size(max = 80) String firstName,
            @Size(max = 80) String lastName,
            @Size(max = 40) String phone) {}

    public record UserDto(Long id, String email, String firstName, String lastName, String phone,
                          boolean emailVerified, boolean admin, Instant createdAt) {}

    public record AuthResponse(String token, UserDto user) {}

    public record AddressDto(
            Long id,
            @Size(max = 60) String label,
            @NotBlank @Size(max = 120) String fullName,
            @Size(max = 40) String phone,
            @NotBlank @Size(max = 200) String line1,
            @Size(max = 200) String line2,
            @NotBlank @Size(max = 100) String city,
            @Size(max = 100) String region,
            @NotBlank @Size(max = 20) String postalCode,
            @NotBlank @Size(max = 80) String country,
            boolean isDefault) {}

    // ---------- Catalogue ----------

    public record CategoryDto(Long id, String name, String slug, String description, String imageUrl,
                              int sortOrder, boolean featured) {}

    public record CategoryRequest(
            @NotBlank @Size(max = 100) String name,
            @Size(max = 120) String slug,
            @Size(max = 600) String description,
            @Size(max = 600) String imageUrl,
            int sortOrder,
            boolean featured) {}

    public record ImageDto(String url, String altText) {}

    public record PersonalisationDto(
            boolean enabled, boolean allowName, boolean allowInitials, boolean allowDate,
            boolean allowMessage, boolean allowLogo, boolean allowEventDetails, boolean allowInstructions,
            @Min(10) @Max(1000) int messageMaxLength,
            @DecimalMin("0.00") BigDecimal extraCost) {}

    public record ProductSummary(Long id, String name, String slug, String shortDescription,
                                 BigDecimal price, BigDecimal compareAtPrice, String imageUrl, String imageAlt,
                                 String hoverImageUrl, boolean personalisable, boolean inStock, int stock,
                                 boolean bestseller, boolean newArrival, List<String> categorySlugs) {}

    public record ProductDetail(Long id, String name, String slug, String shortDescription, String description,
                                List<SpecRow> specifications, BigDecimal price, BigDecimal compareAtPrice,
                                int stock, boolean inStock, boolean active, boolean featured, boolean bestseller,
                                boolean newArrival, int soldCount, List<ImageDto> images,
                                List<CategoryDto> categories, PersonalisationDto personalisation,
                                Double averageRating, long reviewCount, Instant createdAt) {}

    public record SpecRow(String label, String value) {}

    public record ProductRequest(
            @NotBlank @Size(max = 160) String name,
            @Size(max = 180) String slug,
            @Size(max = 300) String shortDescription,
            @Size(max = 5000) String description,
            @Size(max = 3000) String specifications,
            @NotNull @DecimalMin(value = "0.00") BigDecimal price,
            @DecimalMin(value = "0.00") BigDecimal compareAtPrice,
            @Min(0) int stock,
            boolean active, boolean featured, boolean bestseller, boolean newArrival,
            List<Long> categoryIds,
            List<@Valid ImageDto> images,
            @Valid PersonalisationDto personalisation) {}

    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {}

    public record PriceRange(BigDecimal min, BigDecimal max) {}

    public record ReviewDto(Long id, String authorName, int rating, String title, String body,
                            boolean approved, String productName, Instant createdAt) {}

    public record ReviewRequest(@Min(1) @Max(5) int rating, @Size(max = 140) String title,
                                @NotBlank @Size(max = 2000) String body) {}

    // ---------- Cart & checkout ----------

    public record AddToCartRequest(@NotNull Long productId, @Min(1) @Max(1000) int quantity,
                                   Map<String, String> personalisation) {}

    public record UpdateCartItemRequest(@Min(1) @Max(1000) int quantity) {}

    public record CouponRequest(@NotBlank @Size(max = 40) String code) {}

    public record CartItemDto(Long id, Long productId, String slug, String name, String imageUrl,
                              BigDecimal unitPrice, int quantity, BigDecimal lineTotal, int stock,
                              Map<String, String> personalisation) {}

    public record CartDto(String token, List<CartItemDto> items, int itemCount, BigDecimal subtotal,
                          String couponCode, BigDecimal discount, BigDecimal shippingFee, BigDecimal total,
                          String shippingMethod, BigDecimal freeShippingThreshold, String couponError) {}

    public record CheckoutRequest(
            @NotBlank @Email @Size(max = 160) String email,
            @NotBlank @Size(max = 120) String customerName,
            @Size(max = 40) String phone,
            @NotNull @Valid AddressDto shippingAddress,
            @NotBlank @Pattern(regexp = "STANDARD|EXPRESS|COLLECTION") String shippingMethod,
            @NotBlank @Pattern(regexp = "BANK_TRANSFER|PAY_ON_CONFIRMATION|PAYPAL") String paymentMethod,
            @Size(max = 1000) String notes,
            boolean saveAddress,
            String captchaToken) {}

    public record OrderItemDto(Long productId, String productName, String imageUrl, BigDecimal unitPrice,
                               int quantity, BigDecimal lineTotal, Map<String, String> personalisation) {}

    public record PaymentDto(String provider, String method, BigDecimal amount, String status,
                             String reference, String captureReference, Instant createdAt) {}

    public record OrderDto(Long id, String orderNumber, String status, String paymentStatus, String paymentMethod,
                           String email, String customerName, String phone,
                           AddressDto shippingAddress, String shippingMethod,
                           BigDecimal subtotal, BigDecimal discount, BigDecimal shippingFee, BigDecimal total,
                           String couponCode, String carrier, String trackingNumber, String customerNotes,
                           String adminNotes, List<OrderItemDto> items, List<PaymentDto> payments,
                           Long userId, Instant createdAt, Instant updatedAt) {}

    /** {@code paypalOrderId} is set for PayPal checkouts: the browser approves it, then calls capture. */
    public record CheckoutResponse(OrderDto order, String paymentInstructions, String paypalOrderId) {}

    public record PayPalOrderRequest(
            @NotBlank @Size(max = 24) String orderNumber,
            @NotBlank @Size(max = 64) @Pattern(regexp = "^[A-Za-z0-9-]+$") String paypalOrderId) {}

    /** What the storefront may offer at checkout. Holds only public values. */
    public record PaymentConfigDto(boolean paypalEnabled, String paypalClientId, String currency, boolean captchaEnabled) {}

    public record OrderUpdateRequest(
            @Pattern(regexp = "PENDING|CONFIRMED|IN_PRODUCTION|SHIPPED|DELIVERED|CANCELLED") String status,
            @Pattern(regexp = "UNPAID|PENDING|PAID|REFUNDED|FAILED") String paymentStatus,
            @Size(max = 80) String carrier,
            @Size(max = 120) String trackingNumber,
            @Size(max = 4000) String adminNotes) {}

    public record TrackOrderRequest(@NotBlank String orderNumber, @NotBlank @Email String email) {}

    // ---------- Enquiries & contact ----------

    public record EnquiryRequest(
            @NotBlank @Pattern(regexp = "CORPORATE|BULK|CUSTOM|CONTACT") String type,
            @NotBlank @Size(max = 120) String fullName,
            @NotBlank @Email @Size(max = 160) String email,
            @Size(max = 40) @Pattern(regexp = "^$|^[+0-9 ()\\-]{6,40}$", message = "is not a valid phone number") String phone,
            @Size(max = 160) String companyName,
            @Size(max = 80) String enquiryTopic,
            @Size(max = 80) String eventType,
            @FutureOrPresent(message = "must be today or later") LocalDate eventDate,
            @Size(max = 1000) String productRequirements,
            @Min(1) @Max(1000000) Integer quantity,
            @Size(max = 60) String budgetRange,
            @Size(max = 1000) String personalisationRequirements,
            @Size(max = 3000) String message,
            /** Honeypot: real visitors never fill this. */
            String website,
            String captchaToken) {}

    public record EnquiryDto(Long id, String type, String status, String fullName, String email, String phone,
                             String companyName, String enquiryTopic, String eventType, LocalDate eventDate,
                             String productRequirements, Integer quantity, String budgetRange,
                             String personalisationRequirements, String message, String internalNotes,
                             Instant createdAt, Instant updatedAt) {}

    public record EnquiryUpdateRequest(
            @Pattern(regexp = "NEW|IN_PROGRESS|QUOTED|CONFIRMED|CLOSED") String status,
            @Size(max = 6000) String internalNotes) {}

    public record NewsletterRequest(@NotBlank @Email @Size(max = 160) String email) {}

    // ---------- Content ----------

    public record TestimonialDto(
            Long id,
            @NotBlank @Size(max = 120) String authorName,
            @Size(max = 120) String occasion,
            @NotBlank @Size(max = 1200) String quote,
            @Min(1) @Max(5) int rating,
            boolean active, boolean placeholder, int sortOrder) {}

    public record FaqDto(
            Long id,
            @NotBlank @Size(max = 80) String category,
            @NotBlank @Size(max = 300) String question,
            @NotBlank @Size(max = 3000) String answer,
            int sortOrder, boolean active) {}

    public record CouponDto(
            Long id,
            @NotBlank @Size(max = 40) @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "letters, numbers, - and _ only") String code,
            @NotBlank @Pattern(regexp = "PERCENT|FIXED") String type,
            @NotNull @DecimalMin("0.01") BigDecimal amount,
            @DecimalMin("0.00") BigDecimal minOrderTotal,
            Instant expiresAt,
            @Min(1) Integer usageLimit,
            int usedCount,
            boolean active) {}

    public record UploadResponse(String url) {}

    // ---------- Admin ----------

    public record DashboardDto(long totalOrders, BigDecimal totalRevenue, long pendingOrders, long completedOrders,
                               long totalCustomers, long newEnquiries, long activeProducts,
                               List<BestsellerRow> bestsellers, List<OrderDto> recentOrders) {}

    public record BestsellerRow(String productName, long unitsSold, BigDecimal revenue) {}

    public record CustomerDto(Long id, String email, String firstName, String lastName, String phone,
                              boolean emailVerified, boolean enabled, long orderCount, Instant createdAt) {}

    public record CustomerDetail(CustomerDto customer, List<AddressDto> addresses, List<OrderDto> orders) {}
}
