package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "products")
public class Product extends BaseEntity {
    @Column(nullable = false, length = 160)
    private String name;
    @Column(nullable = false, unique = true, length = 180)
    private String slug;
    @Column(length = 300)
    private String shortDescription;
    @Column(length = 5000)
    private String description;
    /** Free-form "Key: Value" lines rendered as the specification table. */
    @Column(length = 3000)
    private String specifications;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;
    @Column(precision = 10, scale = 2)
    private BigDecimal compareAtPrice;

    private int stock;
    private boolean active = true;
    private boolean featured;
    private boolean bestseller;
    private boolean newArrival;
    /** Units sold, used for popularity sorting. */
    private int soldCount;

    /** Optimistic lock so two simultaneous checkouts cannot oversell the same stock. */
    @Version
    private Long version;

    @ManyToMany
    @JoinTable(name = "product_categories",
            joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories = new HashSet<>();

    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder ASC")
    private List<ProductImage> images = new ArrayList<>();

    @OneToOne(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private ProductPersonalisation personalisation;

    public boolean isPersonalisable() {
        return personalisation != null && personalisation.isEnabled();
    }

    public void setPersonalisation(ProductPersonalisation p) {
        if (p != null) p.setProduct(this);
        this.personalisation = p;
    }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getShortDescription() { return shortDescription; }
    public void setShortDescription(String shortDescription) { this.shortDescription = shortDescription; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getSpecifications() { return specifications; }
    public void setSpecifications(String specifications) { this.specifications = specifications; }
    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }
    public BigDecimal getCompareAtPrice() { return compareAtPrice; }
    public void setCompareAtPrice(BigDecimal compareAtPrice) { this.compareAtPrice = compareAtPrice; }
    public int getStock() { return stock; }
    public void setStock(int stock) { this.stock = stock; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
    public boolean isBestseller() { return bestseller; }
    public void setBestseller(boolean bestseller) { this.bestseller = bestseller; }
    public boolean isNewArrival() { return newArrival; }
    public void setNewArrival(boolean newArrival) { this.newArrival = newArrival; }
    public int getSoldCount() { return soldCount; }
    public void setSoldCount(int soldCount) { this.soldCount = soldCount; }
    public Set<Category> getCategories() { return categories; }
    public List<ProductImage> getImages() { return images; }
    public ProductPersonalisation getPersonalisation() { return personalisation; }
}
