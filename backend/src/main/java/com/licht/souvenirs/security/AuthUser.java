package com.licht.souvenirs.security;

import com.licht.souvenirs.domain.User;
import java.util.List;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

/** The authenticated principal placed in the security context. */
public record AuthUser(Long id, String email, boolean admin) {
    public static AuthUser of(User u) {
        return new AuthUser(u.getId(), u.getEmail(), u.isAdmin());
    }

    public static List<SimpleGrantedAuthority> authoritiesOf(User u) {
        return u.getRoles().stream().map(r -> new SimpleGrantedAuthority(r.getName())).toList();
    }
}
