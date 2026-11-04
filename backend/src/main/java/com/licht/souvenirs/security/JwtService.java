package com.licht.souvenirs.security;

import com.licht.souvenirs.domain.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.Date;
import java.util.Optional;
import java.util.Set;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    /** Values published in this repository; anyone could sign tokens with them. */
    private static final Set<String> PUBLISHED_SECRETS = Set.of(
            "dev-only-secret-change-me-licht-signature-souvenirs-2026",
            "replace-with-a-long-random-string-of-at-least-32-characters",
            "local-profile-only-secret-licht-signature-souvenirs");
    private static final String LOCAL_SECRET = "local-profile-only-secret-licht-signature-souvenirs";

    private final SecretKey key;
    private final long expirationMinutes;

    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.expiration-minutes}") long expirationMinutes,
                      Environment env) {
        boolean local = Arrays.asList(env.getActiveProfiles()).contains("local");
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("JWT_SECRET is not set. Set it to a long random value (at least 32 characters).");
        }
        if (PUBLISHED_SECRETS.contains(secret) && !(local && LOCAL_SECRET.equals(secret))) {
            throw new IllegalStateException("JWT_SECRET is set to a published example value. Generate a new random secret.");
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException("JWT_SECRET must be at least 32 bytes");
        }
        this.key = Keys.hmacShaKeyFor(bytes);
        this.expirationMinutes = expirationMinutes;
    }

    /** A verified token: the user it names and the token version it was issued under. */
    public record Subject(Long userId, int version) {}

    public String issue(User u) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(String.valueOf(u.getId()))
                .claim("email", u.getEmail())
                .claim("ver", u.getTokenVersion())
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationMinutes, ChronoUnit.MINUTES)))
                .signWith(key)
                .compact();
    }

    /** Returns the subject if the token is valid and unexpired. */
    public Optional<Subject> verify(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            Number ver = claims.get("ver", Number.class);
            return Optional.of(new Subject(Long.valueOf(claims.getSubject()), ver == null ? 0 : ver.intValue()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
