package com.licht.souvenirs.domain;

import jakarta.persistence.*;
import java.util.ArrayList;
import java.util.List;

/**
 * A server-side cart. Guests are identified by an opaque token kept in the browser;
 * signed-in customers own exactly one cart, which absorbs their guest cart on login.
 */
@Entity
@Table(name = "carts")
public class Cart extends BaseEntity {
    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(length = 40)
    private String couponCode;

    @OneToMany(mappedBy = "cart", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    private List<CartItem> items = new ArrayList<>();

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getCouponCode() { return couponCode; }
    public void setCouponCode(String couponCode) { this.couponCode = couponCode; }
    public List<CartItem> getItems() { return items; }
}
