package com.licht.souvenirs.service;

import com.licht.souvenirs.domain.Role;
import com.licht.souvenirs.domain.User;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.RoleRepository;
import com.licht.souvenirs.repo.Repositories.UserRepository;
import com.licht.souvenirs.security.JwtService;
import com.licht.souvenirs.security.Tokens;
import com.licht.souvenirs.web.ApiException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final EmailService email;
    private final CartService carts;
    private final Mapper mapper;
    private final String frontendUrl;
    /** Compared against when the email is unknown, so a miss costs the same bcrypt time as a hit. */
    private final String dummyHash;

    public AuthService(UserRepository users, RoleRepository roles, PasswordEncoder encoder, JwtService jwt,
                       EmailService email, CartService carts, Mapper mapper,
                       @Value("${app.frontend-url}") String frontendUrl) {
        this.users = users;
        this.roles = roles;
        this.encoder = encoder;
        this.jwt = jwt;
        this.email = email;
        this.carts = carts;
        this.mapper = mapper;
        this.frontendUrl = frontendUrl;
        this.dummyHash = encoder.encode(Tokens.random());
    }

    @Transactional
    public AuthResponse register(RegisterRequest r, String guestCartToken) {
        String normalized = r.email().trim().toLowerCase();
        if (users.existsByEmailIgnoreCase(normalized)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists.");
        }
        User u = new User();
        u.setEmail(normalized);
        u.setFirstName(r.firstName().trim());
        u.setLastName(blankToNull(r.lastName()));
        u.setPhone(blankToNull(r.phone()));
        u.setPasswordHash(encoder.encode(r.password()));
        String verification = Tokens.random();
        u.setVerificationToken(Tokens.hash(verification));
        u.getRoles().add(roles.findByName(Role.CUSTOMER).orElseGet(() -> roles.save(new Role(Role.CUSTOMER))));
        users.save(u);
        email.send(u.getEmail(), "Welcome to LICHT Signature — please verify your email",
                "Dear " + u.getFirstName() + ",\n\nThank you for joining LICHT Signature Souvenirs.\n"
                        + "Please confirm your email address:\n" + frontendUrl + "/verify-email?token="
                        + verification + "\n\nWith warm regards,\nLICHT Signature Souvenirs");
        carts.attachGuestCart(guestCartToken, u);
        return new AuthResponse(jwt.issue(u), mapper.user(u));
    }

    @Transactional
    public AuthResponse login(LoginRequest r, String guestCartToken) {
        Optional<User> found = users.findByEmailIgnoreCase(r.email().trim());
        boolean ok = encoder.matches(r.password(), found.map(User::getPasswordHash).orElse(dummyHash));
        User u = found.filter(x -> ok)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "The email or password is incorrect."));
        if (!u.isEnabled()) throw new ApiException(HttpStatus.FORBIDDEN, "This account has been disabled.");
        carts.attachGuestCart(guestCartToken, u);
        return new AuthResponse(jwt.issue(u), mapper.user(u));
    }

    @Transactional
    public void verifyEmail(String token) {
        User u = users.findByVerificationToken(Tokens.hash(token))
                .orElseThrow(() -> ApiException.badRequest("This verification link is invalid or has already been used."));
        u.setEmailVerified(true);
        u.setVerificationToken(null);
    }

    @Transactional
    public void resendVerification(Long userId) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        if (u.isEmailVerified()) return;
        String verification = Tokens.random();
        u.setVerificationToken(Tokens.hash(verification));
        email.send(u.getEmail(), "Verify your email — LICHT Signature",
                "Please confirm your email address:\n" + frontendUrl + "/verify-email?token=" + verification);
    }

    /** Always succeeds from the caller's view so the endpoint cannot be used to discover accounts. */
    @Transactional
    public void forgotPassword(String emailAddress) {
        users.findByEmailIgnoreCase(emailAddress.trim()).ifPresent(u -> {
            String reset = Tokens.random();
            u.setResetToken(Tokens.hash(reset));
            u.setResetTokenExpiresAt(Instant.now().plus(1, ChronoUnit.HOURS));
            email.send(u.getEmail(), "Reset your password — LICHT Signature",
                    "We received a request to reset your password. This link is valid for one hour:\n"
                            + frontendUrl + "/reset-password?token=" + reset
                            + "\n\nIf you did not request this, you can ignore this email.");
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest r) {
        User u = users.findByResetToken(Tokens.hash(r.token()))
                .filter(x -> x.getResetTokenExpiresAt() != null && Instant.now().isBefore(x.getResetTokenExpiresAt()))
                .orElseThrow(() -> ApiException.badRequest("This reset link is invalid or has expired."));
        u.setPasswordHash(encoder.encode(r.password()));
        u.setResetToken(null);
        u.setResetTokenExpiresAt(null);
        u.revokeTokens();
    }

    /** Changes the password, signs out every other session, and returns a fresh token for this one. */
    @Transactional
    public AuthResponse changePassword(Long userId, ChangePasswordRequest r) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        if (!encoder.matches(r.currentPassword(), u.getPasswordHash())) {
            throw ApiException.badRequest("Your current password is incorrect.");
        }
        u.setPasswordHash(encoder.encode(r.newPassword()));
        u.revokeTokens();
        return new AuthResponse(jwt.issue(u), mapper.user(u));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return mapper.user(users.findById(userId).orElseThrow(() -> ApiException.notFound("Account")));
    }

    @Transactional
    public UserDto updateProfile(Long userId, ProfileUpdate r) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("Account"));
        u.setFirstName(r.firstName().trim());
        u.setLastName(blankToNull(r.lastName()));
        u.setPhone(blankToNull(r.phone()));
        return mapper.user(u);
    }

    static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
