package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "testimonials")
public class Testimonial extends BaseEntity {
    @Column(nullable = false, length = 120) private String authorName;
    @Column(length = 120) private String occasion;
    @Column(nullable = false, length = 1200) private String quote;
    private int rating = 5;
    private boolean active = true;
    /** Placeholder testimonials are flagged so they are never mistaken for real reviews. */
    private boolean placeholder;
    private int sortOrder;

    public String getAuthorName() { return authorName; }
    public void setAuthorName(String authorName) { this.authorName = authorName; }
    public String getOccasion() { return occasion; }
    public void setOccasion(String occasion) { this.occasion = occasion; }
    public String getQuote() { return quote; }
    public void setQuote(String quote) { this.quote = quote; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public boolean isPlaceholder() { return placeholder; }
    public void setPlaceholder(boolean placeholder) { this.placeholder = placeholder; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
}
