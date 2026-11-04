package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Which personalisation fields a product offers. Only enabled fields are shown on the storefront. */
@Entity
@Table(name = "product_personalisation")
public class ProductPersonalisation extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", unique = true)
    private Product product;

    private boolean enabled = true;
    private boolean allowName;
    private boolean allowInitials;
    private boolean allowDate;
    private boolean allowMessage;
    private boolean allowLogo;
    private boolean allowEventDetails;
    private boolean allowInstructions = true;
    private int messageMaxLength = 120;
    @Column(precision = 10, scale = 2)
    private BigDecimal extraCost = BigDecimal.ZERO;

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public boolean isAllowName() { return allowName; }
    public void setAllowName(boolean allowName) { this.allowName = allowName; }
    public boolean isAllowInitials() { return allowInitials; }
    public void setAllowInitials(boolean allowInitials) { this.allowInitials = allowInitials; }
    public boolean isAllowDate() { return allowDate; }
    public void setAllowDate(boolean allowDate) { this.allowDate = allowDate; }
    public boolean isAllowMessage() { return allowMessage; }
    public void setAllowMessage(boolean allowMessage) { this.allowMessage = allowMessage; }
    public boolean isAllowLogo() { return allowLogo; }
    public void setAllowLogo(boolean allowLogo) { this.allowLogo = allowLogo; }
    public boolean isAllowEventDetails() { return allowEventDetails; }
    public void setAllowEventDetails(boolean allowEventDetails) { this.allowEventDetails = allowEventDetails; }
    public boolean isAllowInstructions() { return allowInstructions; }
    public void setAllowInstructions(boolean allowInstructions) { this.allowInstructions = allowInstructions; }
    public int getMessageMaxLength() { return messageMaxLength; }
    public void setMessageMaxLength(int messageMaxLength) { this.messageMaxLength = messageMaxLength; }
    public BigDecimal getExtraCost() { return extraCost; }
    public void setExtraCost(BigDecimal extraCost) { this.extraCost = extraCost; }
}
