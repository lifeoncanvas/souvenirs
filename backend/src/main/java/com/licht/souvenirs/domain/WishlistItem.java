package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "wishlist_items", uniqueConstraints = @UniqueConstraint(columnNames = {"user_id", "product_id"}))
public class WishlistItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    protected WishlistItem() {}

    public WishlistItem(User user, Product product) {
        this.user = user;
        this.product = product;
    }

    public User getUser() { return user; }
    public Product getProduct() { return product; }
}
