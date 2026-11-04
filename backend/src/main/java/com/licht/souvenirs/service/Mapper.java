package com.licht.souvenirs.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.licht.souvenirs.domain.*;
import com.licht.souvenirs.dto.Dtos.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/** Entity to DTO conversion. Call inside a transaction so lazy associations can load. */
@Component
public class Mapper {
    private static final TypeReference<LinkedHashMap<String, String>> MAP_TYPE = new TypeReference<>() {};
    private final ObjectMapper json;

    public Mapper(ObjectMapper json) {
        this.json = json;
    }

    public UserDto user(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.getPhone(),
                u.isEmailVerified(), u.isAdmin(), u.getCreatedAt());
    }

    public AddressDto address(Address a) {
        return new AddressDto(a.getId(), a.getLabel(), a.getFullName(), a.getPhone(), a.getLine1(), a.getLine2(),
                a.getCity(), a.getRegion(), a.getPostalCode(), a.getCountry(), a.isDefaultAddress());
    }

    public CategoryDto category(Category c) {
        return new CategoryDto(c.getId(), c.getName(), c.getSlug(), c.getDescription(), c.getImageUrl(),
                c.getSortOrder(), c.isFeatured());
    }

    public ProductSummary summary(Product p) {
        List<ProductImage> imgs = p.getImages();
        ProductImage first = imgs.isEmpty() ? null : imgs.get(0);
        ProductImage second = imgs.size() > 1 ? imgs.get(1) : null;
        return new ProductSummary(p.getId(), p.getName(), p.getSlug(), p.getShortDescription(), p.getPrice(),
                p.getCompareAtPrice(), first == null ? null : first.getUrl(),
                first == null || first.getAltText() == null ? p.getName() : first.getAltText(),
                second == null ? null : second.getUrl(), p.isPersonalisable(), p.getStock() > 0, p.getStock(),
                p.isBestseller(), p.isNewArrival(),
                p.getCategories().stream().map(Category::getSlug).sorted().toList());
    }

    public ProductDetail detail(Product p, Double avgRating, long reviewCount) {
        return new ProductDetail(p.getId(), p.getName(), p.getSlug(), p.getShortDescription(), p.getDescription(),
                specs(p.getSpecifications()), p.getPrice(), p.getCompareAtPrice(), p.getStock(), p.getStock() > 0,
                p.isActive(), p.isFeatured(), p.isBestseller(), p.isNewArrival(), p.getSoldCount(),
                p.getImages().stream().map(i -> new ImageDto(i.getUrl(), i.getAltText())).toList(),
                p.getCategories().stream().map(this::category).toList(),
                personalisation(p.getPersonalisation()), avgRating, reviewCount, p.getCreatedAt());
    }

    public PersonalisationDto personalisation(ProductPersonalisation pp) {
        if (pp == null) return null;
        return new PersonalisationDto(pp.isEnabled(), pp.isAllowName(), pp.isAllowInitials(), pp.isAllowDate(),
                pp.isAllowMessage(), pp.isAllowLogo(), pp.isAllowEventDetails(), pp.isAllowInstructions(),
                pp.getMessageMaxLength(), pp.getExtraCost());
    }

    /** Parses "Label: value" lines into rows; lines without a colon become a value-only row. */
    public static List<SpecRow> specs(String raw) {
        if (raw == null || raw.isBlank()) return List.of();
        List<SpecRow> rows = new ArrayList<>();
        for (String line : raw.split("\\r?\\n")) {
            String t = line.trim();
            if (t.isEmpty()) continue;
            int i = t.indexOf(':');
            rows.add(i > 0 ? new SpecRow(t.substring(0, i).trim(), t.substring(i + 1).trim()) : new SpecRow("", t));
        }
        return rows;
    }

    public Map<String, String> readMap(String s) {
        if (s == null || s.isBlank()) return null;
        try {
            return Collections.unmodifiableMap(json.readValue(s, MAP_TYPE));
        } catch (Exception e) {
            return null;
        }
    }

    public String writeMap(Map<String, String> m) {
        if (m == null || m.isEmpty()) return null;
        try {
            return json.writeValueAsString(m);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    public OrderDto order(Order o) {
        AddressDto ship = new AddressDto(null, null, o.getShipFullName(), o.getShipPhone(), o.getShipLine1(),
                o.getShipLine2(), o.getShipCity(), o.getShipRegion(), o.getShipPostalCode(), o.getShipCountry(), false);
        List<OrderItemDto> items = o.getItems().stream().map(i -> new OrderItemDto(
                i.getProduct() == null ? null : i.getProduct().getId(), i.getProductName(), i.getImageUrl(),
                i.getUnitPrice(), i.getQuantity(), i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())),
                readMap(i.getPersonalisationJson()))).toList();
        List<PaymentDto> payments = o.getPayments().stream().map(p -> new PaymentDto(p.getProvider(), p.getMethod(),
                p.getAmount(), p.getStatus().name(), p.getProviderReference(), p.getCaptureReference(),
                p.getCreatedAt())).toList();
        return new OrderDto(o.getId(), o.getOrderNumber(), o.getStatus().name(), o.getPaymentStatus().name(),
                o.getPaymentMethod(), o.getEmail(), o.getCustomerName(), o.getPhone(), ship, o.getShippingMethod().name(),
                o.getSubtotal(), o.getDiscount(), o.getShippingFee(), o.getTotal(), o.getCouponCode(),
                o.getCarrier(), o.getTrackingNumber(), o.getCustomerNotes(), o.getAdminNotes(), items, payments,
                o.getUser() == null ? null : o.getUser().getId(), o.getCreatedAt(), o.getUpdatedAt());
    }

    /** Customer-facing view: hides internal admin notes. */
    public OrderDto customerOrder(Order o) {
        OrderDto d = order(o);
        return new OrderDto(d.id(), d.orderNumber(), d.status(), d.paymentStatus(), d.paymentMethod(), d.email(), d.customerName(),
                d.phone(), d.shippingAddress(), d.shippingMethod(), d.subtotal(), d.discount(), d.shippingFee(),
                d.total(), d.couponCode(), d.carrier(), d.trackingNumber(), d.customerNotes(), null, d.items(),
                d.payments(), d.userId(), d.createdAt(), d.updatedAt());
    }

    public EnquiryDto enquiry(Enquiry e) {
        return new EnquiryDto(e.getId(), e.getType().name(), e.getStatus().name(), e.getFullName(), e.getEmail(),
                e.getPhone(), e.getCompanyName(), e.getEnquiryTopic(), e.getEventType(), e.getEventDate(),
                e.getProductRequirements(), e.getQuantity(), e.getBudgetRange(), e.getPersonalisationRequirements(),
                e.getMessage(), e.getInternalNotes(), e.getCreatedAt(), e.getUpdatedAt());
    }

    public TestimonialDto testimonial(Testimonial t) {
        return new TestimonialDto(t.getId(), t.getAuthorName(), t.getOccasion(), t.getQuote(), t.getRating(),
                t.isActive(), t.isPlaceholder(), t.getSortOrder());
    }

    public FaqDto faq(Faq f) {
        return new FaqDto(f.getId(), f.getCategory(), f.getQuestion(), f.getAnswer(), f.getSortOrder(), f.isActive());
    }

    public CouponDto coupon(Coupon c) {
        return new CouponDto(c.getId(), c.getCode(), c.getType().name(), c.getAmount(), c.getMinOrderTotal(),
                c.getExpiresAt(), c.getUsageLimit(), c.getUsedCount(), c.isActive());
    }

    public ReviewDto review(Review r) {
        User u = r.getUser();
        String author = u.getFirstName() + (u.getLastName() == null || u.getLastName().isBlank()
                ? "" : " " + u.getLastName().charAt(0) + ".");
        return new ReviewDto(r.getId(), author, r.getRating(), r.getTitle(), r.getBody(), r.isApproved(),
                r.getProduct().getName(), r.getCreatedAt());
    }
}
