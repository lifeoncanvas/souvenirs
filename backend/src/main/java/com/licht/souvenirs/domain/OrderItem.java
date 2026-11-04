package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;

/** Snapshot of a purchased line: name and price are copied so later catalogue edits never rewrite history. */
@Entity
@Table(name = "order_items")
public class OrderItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false, length = 160)
    private String productName;
    @Column(length = 600)
    private String imageUrl;
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;
    private int quantity;
    @Column(length = 4000)
    private String personalisationJson;

    public Order getOrder() { return order; }
    public void setOrder(Order order) { this.order = order; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getPersonalisationJson() { return personalisationJson; }
    public void setPersonalisationJson(String personalisationJson) { this.personalisationJson = personalisationJson; }
}
