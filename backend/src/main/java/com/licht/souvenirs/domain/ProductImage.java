package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "product_images")
public class ProductImage extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id")
    private Product product;
    @Column(nullable = false, length = 600)
    private String url;
    @Column(length = 200)
    private String altText;
    private int sortOrder;

    protected ProductImage() {}

    public ProductImage(Product product, String url, String altText, int sortOrder) {
        this.product = product;
        this.url = url;
        this.altText = altText;
        this.sortOrder = sortOrder;
    }

    public Product getProduct() { return product; }
    public String getUrl() { return url; }
    public String getAltText() { return altText; }
    public int getSortOrder() { return sortOrder; }
}
