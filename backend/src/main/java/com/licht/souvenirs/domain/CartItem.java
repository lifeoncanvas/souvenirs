package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "cart_items")
public class CartItem extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id")
    private Cart cart;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id")
    private Product product;

    private int quantity;

    /** JSON object of the customer's personalisation choices, or null. */
    @Column(length = 4000)
    private String personalisationJson;

    public Cart getCart() { return cart; }
    public void setCart(Cart cart) { this.cart = cart; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int quantity) { this.quantity = quantity; }
    public String getPersonalisationJson() { return personalisationJson; }
    public void setPersonalisationJson(String personalisationJson) { this.personalisationJson = personalisationJson; }
}
