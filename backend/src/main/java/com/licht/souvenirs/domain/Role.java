package com.licht.souvenirs.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "roles")
public class Role {
    public static final String CUSTOMER = "ROLE_CUSTOMER";
    public static final String ADMIN = "ROLE_ADMIN";

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 40)
    private String name;

    protected Role() {}
    public Role(String name) { this.name = name; }

    public Long getId() { return id; }
    public String getName() { return name; }
}
