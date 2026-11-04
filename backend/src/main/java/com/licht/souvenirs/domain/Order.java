package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "orders")
public class Order extends BaseEntity {
    public enum Status { PENDING, CONFIRMED, IN_PRODUCTION, SHIPPED, DELIVERED, CANCELLED }
    public enum PaymentStatus { UNPAID, PENDING, PAID, REFUNDED, FAILED }
    public enum ShippingMethod { STANDARD, EXPRESS, COLLECTION }

    @Column(nullable = false, unique = true, length = 24)
    private String orderNumber;

    /** Null for guest checkout. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(nullable = false, length = 160)
    private String email;
    @Column(nullable = false, length = 120)
    private String customerName;
    @Column(length = 40)
    private String phone;

    @Column(nullable = false, length = 120) private String shipFullName;
    @Column(length = 40) private String shipPhone;
    @Column(nullable = false, length = 200) private String shipLine1;
    @Column(length = 200) private String shipLine2;
    @Column(nullable = false, length = 100) private String shipCity;
    @Column(length = 100) private String shipRegion;
    @Column(nullable = false, length = 20) private String shipPostalCode;
    @Column(nullable = false, length = 80) private String shipCountry;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShippingMethod shippingMethod = ShippingMethod.STANDARD;

    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal subtotal;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal discount = BigDecimal.ZERO;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal shippingFee = BigDecimal.ZERO;
    @Column(nullable = false, precision = 10, scale = 2) private BigDecimal total;
    @Column(length = 40) private String couponCode;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.PENDING;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus paymentStatus = PaymentStatus.UNPAID;

    /** BANK_TRANSFER, PAY_ON_CONFIRMATION or PAYPAL; null for orders placed before it was recorded. */
    @Column(length = 30) private String paymentMethod;
    /** While still PENDING and unpaid after this moment, the order is cancelled and restocked. */
    private Instant expiresAt;

    @Column(length = 80) private String carrier;
    @Column(length = 120) private String trackingNumber;
    @Column(length = 1000) private String customerNotes;
    @Column(length = 4000) private String adminNotes;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<OrderItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<Payment> payments = new ArrayList<>();

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getShipFullName() { return shipFullName; }
    public void setShipFullName(String v) { this.shipFullName = v; }
    public String getShipPhone() { return shipPhone; }
    public void setShipPhone(String v) { this.shipPhone = v; }
    public String getShipLine1() { return shipLine1; }
    public void setShipLine1(String v) { this.shipLine1 = v; }
    public String getShipLine2() { return shipLine2; }
    public void setShipLine2(String v) { this.shipLine2 = v; }
    public String getShipCity() { return shipCity; }
    public void setShipCity(String v) { this.shipCity = v; }
    public String getShipRegion() { return shipRegion; }
    public void setShipRegion(String v) { this.shipRegion = v; }
    public String getShipPostalCode() { return shipPostalCode; }
    public void setShipPostalCode(String v) { this.shipPostalCode = v; }
    public String getShipCountry() { return shipCountry; }
    public void setShipCountry(String v) { this.shipCountry = v; }
    public ShippingMethod getShippingMethod() { return shippingMethod; }
    public void setShippingMethod(ShippingMethod shippingMethod) { this.shippingMethod = shippingMethod; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDiscount() { return discount; }
    public void setDiscount(BigDecimal discount) { this.discount = discount; }
    public BigDecimal getShippingFee() { return shippingFee; }
    public void setShippingFee(BigDecimal shippingFee) { this.shippingFee = shippingFee; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public PaymentStatus getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(PaymentStatus paymentStatus) { this.paymentStatus = paymentStatus; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public String getCarrier() { return carrier; }
    public void setCarrier(String carrier) { this.carrier = carrier; }
    public String getTrackingNumber() { return trackingNumber; }
    public void setTrackingNumber(String trackingNumber) { this.trackingNumber = trackingNumber; }
    public String getCustomerNotes() { return customerNotes; }
    public void setCustomerNotes(String customerNotes) { this.customerNotes = customerNotes; }
    public String getAdminNotes() { return adminNotes; }
    public void setAdminNotes(String adminNotes) { this.adminNotes = adminNotes; }
    public List<OrderItem> getItems() { return items; }
    public List<Payment> getPayments() { return payments; }
}
