package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

@Entity
@Table(name = "coupons")
public class Coupon extends BaseEntity {
    public enum Type { PERCENT, FIXED }

    @Column(nullable = false, unique = true, length = 40)
    private String code;
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Type type = Type.PERCENT;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;
    @Column(precision = 10, scale = 2)
    private BigDecimal minOrderTotal;
    private Instant expiresAt;
    private Integer usageLimit;
    private int usedCount;
    private boolean active = true;

    /** Optimistic lock so concurrent checkouts cannot push usedCount past usageLimit. */
    @Version
    private Long version;

    /** Returns null when usable, otherwise the reason it cannot be applied. */
    public String rejectionReason(BigDecimal subtotal) {
        if (!active) return "This code is no longer active.";
        if (expiresAt != null && Instant.now().isAfter(expiresAt)) return "This code has expired.";
        if (usageLimit != null && usedCount >= usageLimit) return "This code has reached its usage limit.";
        if (minOrderTotal != null && subtotal.compareTo(minOrderTotal) < 0)
            return "This code requires a minimum order of " + minOrderTotal.setScale(2, RoundingMode.HALF_UP) + ".";
        return null;
    }

    public BigDecimal discountFor(BigDecimal subtotal) {
        BigDecimal d = type == Type.PERCENT
                ? subtotal.multiply(amount).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                : amount;
        return d.min(subtotal).setScale(2, RoundingMode.HALF_UP);
    }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public BigDecimal getMinOrderTotal() { return minOrderTotal; }
    public void setMinOrderTotal(BigDecimal minOrderTotal) { this.minOrderTotal = minOrderTotal; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer usageLimit) { this.usageLimit = usageLimit; }
    public int getUsedCount() { return usedCount; }
    public void setUsedCount(int usedCount) { this.usedCount = usedCount; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
