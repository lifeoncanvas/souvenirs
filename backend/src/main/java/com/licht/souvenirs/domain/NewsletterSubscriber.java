package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "newsletter_subscribers")
public class NewsletterSubscriber extends BaseEntity {
    @Column(nullable = false, unique = true, length = 160)
    private String email;
    private boolean active = true;

    protected NewsletterSubscriber() {}
    public NewsletterSubscriber(String email) { this.email = email; }

    public String getEmail() { return email; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
}
