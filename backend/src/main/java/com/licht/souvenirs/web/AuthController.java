package com.licht.souvenirs.web;

import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.security.AuthUser;
import com.licht.souvenirs.security.CaptchaService;
import com.licht.souvenirs.security.RateLimiter;
import com.licht.souvenirs.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final RateLimiter limiter;
    private final CaptchaService captcha;

    public AuthController(AuthService auth, RateLimiter limiter, CaptchaService captcha) {
        this.auth = auth;
        this.limiter = limiter;
        this.captcha = captcha;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody RegisterRequest r,
                                 @RequestHeader(value = "X-Cart-Token", required = false) String cart,
                                 HttpServletRequest req) {
        limiter.check(req, "register", 10, 3600);
        captcha.verify(r.captchaToken(), req);
        return auth.register(r, cart);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest r,
                              @RequestHeader(value = "X-Cart-Token", required = false) String cart,
                              HttpServletRequest req) {
        limiter.check(req, "login", 20, 900);
        return auth.login(r, cart);
    }

    @PostMapping("/verify-email")
    public Map<String, String> verify(@RequestBody Map<String, String> body, HttpServletRequest req) {
        limiter.check(req, "verify", 20, 900);
        String token = body.get("token");
        if (token == null || token.isBlank() || token.length() > 200) throw ApiException.badRequest("Missing verification token.");
        auth.verifyEmail(token);
        return Map.of("message", "Thank you — your email is verified.");
    }

    @PostMapping("/resend-verification")
    public Map<String, String> resend(@AuthenticationPrincipal AuthUser me, HttpServletRequest req) {
        if (me == null) throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        limiter.check(req, "resend", 5, 3600);
        auth.resendVerification(me.id());
        return Map.of("message", "A new verification link is on its way.");
    }

    @PostMapping("/forgot-password")
    public Map<String, String> forgot(@Valid @RequestBody ForgotPasswordRequest r, HttpServletRequest req) {
        limiter.check(req, "forgot", 5, 900);
        captcha.verify(r.captchaToken(), req);
        auth.forgotPassword(r.email());
        return Map.of("message", "If an account exists for that email, a reset link is on its way.");
    }

    @PostMapping("/reset-password")
    public Map<String, String> reset(@Valid @RequestBody ResetPasswordRequest r, HttpServletRequest req) {
        limiter.check(req, "reset", 10, 900);
        auth.resetPassword(r);
        return Map.of("message", "Your password has been updated. You can now sign in.");
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal AuthUser me) {
        if (me == null) throw new ApiException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Please sign in to continue.");
        return auth.me(me.id());
    }
}
