package com.licht.souvenirs.service;

import com.licht.souvenirs.domain.*;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.*;
import com.licht.souvenirs.web.ApiException;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OrderService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    private final OrderRepository orders;
    private final ProductRepository products;
    private final CouponRepository coupons;
    private final UserRepository users;
    private final AddressRepository addresses;
    private final CartService carts;
    private final PaymentService payments;
    private final EmailService email;
    private final Mapper mapper;
    private final Duration unpaidExpiry;
    private final Duration paypalExpiry;

    public OrderService(OrderRepository orders, ProductRepository products, CouponRepository coupons,
                        UserRepository users, AddressRepository addresses, CartService carts,
                        PaymentService payments, EmailService email, Mapper mapper,
                        @Value("${app.orders.unpaid-expiry-hours}") long unpaidExpiryHours,
                        @Value("${app.orders.paypal-expiry-minutes}") long paypalExpiryMinutes) {
        this.orders = orders;
        this.products = products;
        this.coupons = coupons;
        this.users = users;
        this.addresses = addresses;
        this.carts = carts;
        this.payments = payments;
        this.email = email;
        this.mapper = mapper;
        this.unpaidExpiry = Duration.ofHours(unpaidExpiryHours);
        this.paypalExpiry = Duration.ofMinutes(paypalExpiryMinutes);
    }

    @Transactional
    public CheckoutResponse checkout(Long userId, String cartToken, CheckoutRequest r) {
        Cart cart = carts.find(userId, cartToken).filter(c -> !c.getItems().isEmpty())
                .orElseThrow(() -> ApiException.badRequest("Your bag is empty."));
        boolean paypal = PaymentService.PAYPAL.equals(r.paymentMethod());

        // Re-validate stock and availability at the moment of purchase.
        for (CartItem i : cart.getItems()) {
            Product p = i.getProduct();
            if (!p.isActive()) throw ApiException.badRequest(p.getName() + " is no longer available.");
            int totalForProduct = cart.getItems().stream()
                    .filter(x -> x.getProduct().getId().equals(p.getId())).mapToInt(CartItem::getQuantity).sum();
            carts.ensureStock(p, totalForProduct);
        }

        CartService.Totals t = carts.totals(cart, r.shippingMethod());
        if (cart.getCouponCode() != null && t.couponError() != null) {
            throw ApiException.badRequest("Discount code: " + t.couponError());
        }

        Order o = new Order();
        o.setOrderNumber(newOrderNumber());
        if (userId != null) o.setUser(users.getReferenceById(userId));
        o.setEmail(r.email().trim().toLowerCase());
        o.setCustomerName(r.customerName().trim());
        o.setPhone(r.phone());
        AddressDto a = r.shippingAddress();
        o.setShipFullName(a.fullName());
        o.setShipPhone(a.phone());
        o.setShipLine1(a.line1());
        o.setShipLine2(a.line2());
        o.setShipCity(a.city());
        o.setShipRegion(a.region());
        o.setShipPostalCode(a.postalCode());
        o.setShipCountry(a.country());
        o.setShippingMethod(Order.ShippingMethod.valueOf(r.shippingMethod()));
        o.setSubtotal(t.subtotal());
        o.setDiscount(t.discount());
        o.setShippingFee(t.shipping());
        o.setTotal(t.total());
        o.setCouponCode(t.coupon() == null ? null : t.coupon().getCode());
        o.setCustomerNotes(r.notes());
        o.setPaymentMethod(r.paymentMethod());
        // Stock is reserved now; an order nobody pays for gives it back once this passes.
        o.setExpiresAt(Instant.now().plus(paypal ? paypalExpiry : unpaidExpiry));

        for (CartItem ci : cart.getItems()) {
            Product p = ci.getProduct();
            OrderItem oi = new OrderItem();
            oi.setOrder(o);
            oi.setProduct(p);
            oi.setProductName(p.getName());
            oi.setImageUrl(p.getImages().isEmpty() ? null : p.getImages().get(0).getUrl());
            oi.setUnitPrice(carts.unitPrice(ci));
            oi.setQuantity(ci.getQuantity());
            oi.setPersonalisationJson(ci.getPersonalisationJson());
            o.getItems().add(oi);
            p.setStock(p.getStock() - ci.getQuantity());
            p.setSoldCount(p.getSoldCount() + ci.getQuantity());
        }
        if (t.coupon() != null) t.coupon().setUsedCount(t.coupon().getUsedCount() + 1);

        PaymentService.Initiation pay = payments.initiate(o, r.paymentMethod());
        orders.save(o);

        if (userId != null && r.saveAddress()) saveAddress(userId, a);

        // A live PayPal order only counts once its payment is captured; otherwise if manual/fallback
        // PayPal or manual payment is used, clear the bag and send confirmation immediately.
        if (pay.paypalOrderId() == null) {
            cart.getItems().clear();
            cart.setCouponCode(null);
            sendConfirmation(o, pay.instructions());
        }
        return new CheckoutResponse(mapper.customerOrder(o), pay.instructions(), pay.paypalOrderId());
    }

    /** Emails the customer their confirmation and tells the studio about the new order. */
    public void sendConfirmation(Order o, String instructions) {
        email.send(o.getEmail(), "Your LICHT Signature order " + o.getOrderNumber(), confirmationEmail(o, instructions));
        email.notifyAdmin("New order " + o.getOrderNumber(),
                o.getCustomerName() + " placed an order totalling " + o.getTotal()
                        + (o.getPaymentStatus() == Order.PaymentStatus.PAID ? " (paid)." : "."));
    }

    /** Cancels an order that was never paid, returning its stock and coupon use. Call with the order row locked. */
    public void cancelUnpaid(Order o, String reason) {
        if (o.getStatus() != Order.Status.PENDING || o.getPaymentStatus() == Order.PaymentStatus.PAID) return;
        restock(o);
        o.setStatus(Order.Status.CANCELLED);
        o.setPaymentStatus(Order.PaymentStatus.UNPAID);
        o.setExpiresAt(null);
        o.getPayments().stream().filter(p -> p.getStatus() == Order.PaymentStatus.PENDING)
                .forEach(p -> p.setStatus(Order.PaymentStatus.FAILED));
        addAdminNote(o, "Cancelled automatically: " + reason + ".");
    }

    public static void addAdminNote(Order o, String note) {
        String line = "[" + Instant.now().toString().substring(0, 16).replace('T', ' ') + " UTC] " + note;
        String notes = o.getAdminNotes() == null || o.getAdminNotes().isBlank() ? line : o.getAdminNotes() + "\n" + line;
        o.setAdminNotes(notes.length() > 4000 ? notes.substring(notes.length() - 4000) : notes);
    }

    /** Ids of PENDING, unpaid orders whose stock reservation has lapsed. */
    @Transactional(readOnly = true)
    public List<Long> expiredUnpaidOrderIds() {
        return orders.expiredUnpaidIds(Instant.now());
    }

    /** Releases one lapsed order. Locks the row and re-checks, so a payment captured meanwhile wins. */
    @Transactional
    public void expire(Long orderId) {
        orders.lockById(orderId).ifPresent(o -> {
            if (o.getStatus() != Order.Status.PENDING || o.getPaymentStatus() == Order.PaymentStatus.PAID
                    || o.getExpiresAt() == null || o.getExpiresAt().isAfter(Instant.now())) return;
            boolean paypal = PaymentService.PAYPAL.equals(o.getPaymentMethod());
            cancelUnpaid(o, paypal ? "PayPal checkout was not completed" : "payment was not received in time");
            // Abandoned PayPal checkouts were never confirmed to the customer, so they get no email.
            if (!paypal) {
                email.send(o.getEmail(), "Order " + o.getOrderNumber() + " has been cancelled",
                        "Dear " + o.getCustomerName() + ",\n\nWe have not received payment for order "
                                + o.getOrderNumber() + ", so it has been cancelled and the pieces released.\n"
                                + "If you have already paid or would still like the order, simply reply to this email.\n\n"
                                + "With warm regards,\nLICHT Signature Souvenirs");
            }
        });
    }

    private void saveAddress(Long userId, AddressDto a) {
        boolean exists = addresses.findByUserIdOrderByDefaultAddressDescIdAsc(userId).stream()
                .anyMatch(x -> x.getLine1().equalsIgnoreCase(a.line1()) && x.getPostalCode().equalsIgnoreCase(a.postalCode()));
        if (exists) return;
        Address ad = new Address();
        ad.setUser(users.getReferenceById(userId));
        ad.setLabel(a.label() == null ? "Delivery" : a.label());
        ad.setFullName(a.fullName());
        ad.setPhone(a.phone());
        ad.setLine1(a.line1());
        ad.setLine2(a.line2());
        ad.setCity(a.city());
        ad.setRegion(a.region());
        ad.setPostalCode(a.postalCode());
        ad.setCountry(a.country());
        ad.setDefaultAddress(addresses.findByUserIdOrderByDefaultAddressDescIdAsc(userId).isEmpty());
        addresses.save(ad);
    }

    private String confirmationEmail(Order o, String instructions) {
        StringBuilder sb = new StringBuilder();
        sb.append("Dear ").append(o.getCustomerName()).append(",\n\n")
                .append("Thank you for your order. Every piece is prepared with care.\n\n")
                .append("Order number: ").append(o.getOrderNumber()).append("\n\n");
        for (OrderItem i : o.getItems()) {
            sb.append("  ").append(i.getQuantity()).append(" × ").append(i.getProductName())
                    .append("  ").append(i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity()))).append('\n');
            Map<String, String> pz = mapper.readMap(i.getPersonalisationJson());
            if (pz != null) pz.forEach((k, v) -> sb.append("      ").append(k).append(": ").append(v).append('\n'));
        }
        sb.append("\nSubtotal: ").append(o.getSubtotal())
                .append("\nDiscount: ").append(o.getDiscount())
                .append("\nDelivery: ").append(o.getShippingFee())
                .append("\nTotal: ").append(o.getTotal())
                .append("\n\n").append(instructions)
                .append("\n\nWith warm regards,\nLICHT Signature Souvenirs");
        return sb.toString();
    }

    private String newOrderNumber() {
        String date = LocalDate.now().format(DateTimeFormatter.ofPattern("yyMMdd"));
        String candidate;
        do {
            StringBuilder sb = new StringBuilder("LS-").append(date).append('-');
            for (int i = 0; i < 5; i++) sb.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
            candidate = sb.toString();
        } while (orders.findByOrderNumber(candidate).isPresent());
        return candidate;
    }

    @Transactional(readOnly = true)
    public List<OrderDto> forUser(Long userId) {
        return orders.findByUserIdOrderByCreatedAtDesc(userId).stream().map(mapper::customerOrder).toList();
    }

    @Transactional(readOnly = true)
    public OrderDto forUser(Long userId, String orderNumber) {
        return orders.findByOrderNumber(orderNumber)
                .filter(o -> o.getUser() != null && o.getUser().getId().equals(userId))
                .map(mapper::customerOrder)
                .orElseThrow(() -> ApiException.notFound("Order"));
    }

    /** Guest-friendly tracking: requires both the order number and the email used at checkout. */
    @Transactional(readOnly = true)
    public OrderDto track(String orderNumber, String emailAddress) {
        return orders.findByOrderNumber(orderNumber.trim().toUpperCase())
                .filter(o -> o.getEmail().equalsIgnoreCase(emailAddress.trim()))
                .map(mapper::customerOrder)
                .orElseThrow(() -> ApiException.notFound("Order"));
    }

    // ---------- Admin ----------

    @Transactional(readOnly = true)
    public PageResponse<OrderDto> adminList(String q, String status, String paymentStatus, int page, int size) {
        List<Specification<Order>> parts = new ArrayList<>();
        if (q != null && !q.isBlank()) {
            String like = "%" + q.trim().toLowerCase() + "%";
            parts.add((r, cq, cb) -> cb.or(cb.like(cb.lower(r.get("orderNumber")), like),
                    cb.like(cb.lower(r.get("email")), like), cb.like(cb.lower(r.get("customerName")), like)));
        }
        if (status != null && !status.isBlank()) {
            Order.Status st = ApiException.parseEnum(Order.Status.class, status, "status");
            parts.add((r, cq, cb) -> cb.equal(r.get("status"), st));
        }
        if (paymentStatus != null && !paymentStatus.isBlank()) {
            Order.PaymentStatus ps = ApiException.parseEnum(Order.PaymentStatus.class, paymentStatus, "payment status");
            parts.add((r, cq, cb) -> cb.equal(r.get("paymentStatus"), ps));
        }
        Page<Order> p = orders.findAll(Specification.allOf(parts),
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), Sort.by("createdAt").descending()));
        return new PageResponse<>(p.getContent().stream().map(mapper::order).toList(), p.getNumber(), p.getSize(),
                p.getTotalElements(), p.getTotalPages());
    }

    @Transactional(readOnly = true)
    public OrderDto adminGet(Long id) {
        return mapper.order(orders.findById(id).orElseThrow(() -> ApiException.notFound("Order")));
    }

    @Transactional
    public OrderDto adminUpdate(Long id, OrderUpdateRequest r) {
        Order o = orders.findById(id).orElseThrow(() -> ApiException.notFound("Order"));
        Order.Status before = o.getStatus();
        if (r.status() != null) {
            Order.Status next = Order.Status.valueOf(r.status());
            if (next == Order.Status.CANCELLED && before != Order.Status.CANCELLED) restock(o);
            if (before == Order.Status.CANCELLED && next != Order.Status.CANCELLED) {
                throw ApiException.badRequest("Cancelled orders cannot be reopened. Please create a new order.");
            }
            o.setStatus(next);
        }
        if (r.paymentStatus() != null) {
            Order.PaymentStatus ps = Order.PaymentStatus.valueOf(r.paymentStatus());
            o.setPaymentStatus(ps);
            if (!o.getPayments().isEmpty()) o.getPayments().get(o.getPayments().size() - 1).setStatus(ps);
        }
        if (r.carrier() != null) o.setCarrier(r.carrier().isBlank() ? null : r.carrier());
        if (r.trackingNumber() != null) o.setTrackingNumber(r.trackingNumber().isBlank() ? null : r.trackingNumber());
        if (r.adminNotes() != null) o.setAdminNotes(r.adminNotes());

        if (o.getStatus() != before) {
            String extra = o.getStatus() == Order.Status.SHIPPED && o.getTrackingNumber() != null
                    ? "\nCarrier: " + (o.getCarrier() == null ? "—" : o.getCarrier()) + "\nTracking: " + o.getTrackingNumber()
                    : "";
            email.send(o.getEmail(), "Order " + o.getOrderNumber() + " update",
                    "Dear " + o.getCustomerName() + ",\n\nYour order " + o.getOrderNumber() + " is now "
                            + o.getStatus().name().replace('_', ' ').toLowerCase() + "." + extra
                            + "\n\nWith warm regards,\nLICHT Signature Souvenirs");
        }
        return mapper.order(o);
    }

    void restock(Order o) {
        for (OrderItem i : o.getItems()) {
            if (i.getProduct() != null) {
                Product p = i.getProduct();
                p.setStock(p.getStock() + i.getQuantity());
                p.setSoldCount(Math.max(0, p.getSoldCount() - i.getQuantity()));
            }
        }
        if (o.getCouponCode() != null) {
            coupons.findByCodeIgnoreCase(o.getCouponCode()).ifPresent(c -> c.setUsedCount(Math.max(0, c.getUsedCount() - 1)));
        }
    }
}
