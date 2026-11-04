package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** A payment attempt. Card data is never stored: only the gateway's reference. */
@Entity
@Table(name = "payments")
public class Payment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @Column(nullable = false, length = 40)
    private String provider;
    @Column(nullable = false, length = 40)
    private String method;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Order.PaymentStatus status;
    /** The gateway's order id (PayPal order) or our order number for manual payments. */
    @Column(length = 200)
    private String providerReference;
    /** The gateway's capture id once money has moved; refunds are issued against it. */
    @Column(length = 200)
    private String captureReference;

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public Order.PaymentStatus getStatus() { return status; }
    public void setStatus(Order.PaymentStatus status) { this.status = status; }
    public String getProviderReference() { return providerReference; }
    public void setProviderReference(String providerReference) { this.providerReference = providerReference; }
    public String getCaptureReference() { return captureReference; }
    public void setCaptureReference(String captureReference) { this.captureReference = captureReference; }
}
