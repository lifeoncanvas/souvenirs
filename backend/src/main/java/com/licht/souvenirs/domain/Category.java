package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "categories")
public class Category extends BaseEntity {
    @Column(nullable = false, length = 100)
    private String name;
    @Column(nullable = false, unique = true, length = 120)
    private String slug;
    @Column(length = 600)
    private String description;
    @Column(length = 600)
    private String imageUrl;
    private int sortOrder;
    /** Shown in the homepage "Gifts Made for Every Occasion" row. */
    private boolean featured;

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public boolean isFeatured() { return featured; }
    public void setFeatured(boolean featured) { this.featured = featured; }
}
