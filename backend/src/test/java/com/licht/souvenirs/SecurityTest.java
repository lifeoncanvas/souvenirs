package com.licht.souvenirs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.licht.souvenirs.domain.User;
import com.licht.souvenirs.repo.Repositories.UserRepository;
import com.licht.souvenirs.security.JwtService;
import com.licht.souvenirs.security.Tokens;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.env.MockEnvironment;

class SecurityTest extends ApiTestSupport {
    @Autowired UserRepository users;

    @Test
    void refusesMissingOrPublishedJwtSecrets() {
        MockEnvironment env = new MockEnvironment();
        assertThatThrownBy(() -> new JwtService("", 60, env)).hasMessageContaining("JWT_SECRET is not set");
        assertThatThrownBy(() -> new JwtService("dev-only-secret-change-me-licht-signature-souvenirs-2026", 60, env))
                .hasMessageContaining("published");
        assertThatThrownBy(() -> new JwtService("local-profile-only-secret-licht-signature-souvenirs", 60, env))
                .hasMessageContaining("published");
        assertThatThrownBy(() -> new JwtService("too-short", 60, env)).hasMessageContaining("32 bytes");
        MockEnvironment local = new MockEnvironment();
        local.setActiveProfiles("local");
        new JwtService("local-profile-only-secret-licht-signature-souvenirs", 60, local);
    }

    @Test
    void adminRoutesNeedTheAdminRole() throws Exception {
        assertThat(get("/api/admin/dashboard", null).status()).isEqualTo(401);
        String customer = register(unique("c") + "@test.local");
        assertThat(get("/api/admin/dashboard", customer).status()).isEqualTo(403);
        String forged = customer.substring(0, customer.length() - 5)
                + (customer.charAt(customer.length() - 5) == 'A' ? 'B' : 'A') + customer.substring(customer.length() - 4);
        assertThat(get("/api/admin/dashboard", forged).status()).isEqualTo(401);
        assertThat(get("/api/admin/dashboard", adminToken()).status()).isEqualTo(200);
    }

    @Test
    void changingPasswordSignsOutOtherSessions() throws Exception {
        String email = unique("pw") + "@test.local";
        String oldToken = register(email);
        Res r = post("/api/account/password", Map.of("currentPassword", "Password123!", "newPassword", "NewPassword456!"), oldToken);
        assertThat(r.status()).isEqualTo(200);
        String fresh = r.body().get("token").asText();
        assertThat(get("/api/account/profile", oldToken).status()).isEqualTo(401);
        assertThat(get("/api/account/profile", fresh).status()).isEqualTo(200);
    }

    @Test
    void passwordResetUsesHashedSingleUseTokensAndRevokesSessions() throws Exception {
        String email = unique("reset") + "@test.local";
        String session = register(email);
        String raw = Tokens.random();
        User u = users.findByEmailIgnoreCase(email).orElseThrow();
        u.setResetToken(Tokens.hash(raw));
        u.setResetTokenExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));
        users.save(u);

        // The stored hash itself is not a usable token.
        assertThat(post("/api/auth/reset-password", Map.of("token", Tokens.hash(raw), "password", "Another789!"), null).status())
                .isEqualTo(400);
        assertThat(post("/api/auth/reset-password", Map.of("token", raw, "password", "Another789!"), null).status())
                .isEqualTo(200);
        assertThat(post("/api/auth/reset-password", Map.of("token", raw, "password", "Again0000!"), null).status())
                .isEqualTo(400);
        assertThat(get("/api/account/profile", session).status()).isEqualTo(401);
        login(email, "Another789!");
    }

    @Test
    void unknownAdminFilterValuesAreBadRequests() throws Exception {
        String admin = adminToken();
        assertThat(get("/api/admin/orders?status=NOPE", admin).status()).isEqualTo(400);
        assertThat(get("/api/admin/enquiries?type=NOPE", admin).status()).isEqualTo(400);
    }

    @Test
    void apiResponsesCarryAStrictContentSecurityPolicy() throws Exception {
        var res = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api/faqs")).andReturn().getResponse();
        assertThat(res.getHeader("Content-Security-Policy")).contains("default-src 'none'").contains("frame-ancestors 'none'");
        assertThat(res.getHeader("X-Frame-Options")).isEqualTo("DENY");
    }

    @Test
    void reviewsNeedAVerifiedPurchase() throws Exception {
        var p = product("20.00", 5);
        String email = unique("rev") + "@test.local";
        String token = register(email);
        Map<String, Object> review = Map.of("rating", 5, "body", "Lovely");
        assertThat(post("/api/products/" + p.getSlug() + "/reviews", review, token).body().get("message").asText())
                .contains("verify your email");
        User u = users.findByEmailIgnoreCase(email).orElseThrow();
        u.setEmailVerified(true);
        users.save(u);
        assertThat(post("/api/products/" + p.getSlug() + "/reviews", review, token).body().get("message").asText())
                .contains("purchased");
    }
}
