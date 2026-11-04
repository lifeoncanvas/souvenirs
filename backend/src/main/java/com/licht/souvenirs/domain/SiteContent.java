package com.licht.souvenirs.domain;

import jakarta.persistence.*;

/**
 * Admin-editable content blocks (hero, about, contact details, instagram...), stored as JSON
 * under a stable key so the storefront can render them without code changes.
 */
@Entity
@Table(name = "site_content")
public class SiteContent extends BaseEntity {
    @Column(name = "content_key", nullable = false, unique = true, length = 80)
    private String key;

    @Column(name = "content_json", nullable = false, length = 20000)
    private String json;

    protected SiteContent() {}

    public SiteContent(String key, String json) {
        this.key = key;
        this.json = json;
    }

    public String getKey() { return key; }
    public String getJson() { return json; }
    public void setJson(String json) { this.json = json; }
}
