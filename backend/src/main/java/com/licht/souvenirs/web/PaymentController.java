package com.licht.souvenirs.web;

import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.security.AuthUser;
import com.licht.souvenirs.security.CaptchaService;
import com.licht.souvenirs.security.RateLimiter;
import com.licht.souvenirs.service.PayPalCheckoutService;
import com.licht.souvenirs.service.PayPalClient;
import com.licht.souvenirs.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Payment options for the storefront, and the PayPal approve → capture flow. */
@RestController
@RequestMapping("/api/payments")
public class PaymentController {
    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService payments;
    private final PayPalClient paypal;
    private final PayPalCheckoutService checkout;
    private final CaptchaService captcha;
    private final RateLimiter limiter;

    public PaymentController(PaymentService payments, PayPalClient paypal, PayPalCheckoutService checkout,
                             CaptchaService captcha, RateLimiter limiter) {
        this.payments = payments;
        this.paypal = paypal;
        this.checkout = checkout;
        this.captcha = captcha;
        this.limiter = limiter;
    }

    @GetMapping("/config")
    public PaymentConfigDto config() {
        return new PaymentConfigDto(paypal.enabled(), paypal.enabled() ? paypal.clientId() : null,
                payments.currency(), captcha.enabled());
    }

    @PostMapping("/paypal/capture")
    public CheckoutResponse capture(@AuthenticationPrincipal AuthUser me,
                                    @RequestHeader(value = "X-Cart-Token", required = false) String cartToken,
                                    @Valid @RequestBody PayPalOrderRequest r, HttpServletRequest req) {
        limiter.check(req, "paypal-capture", 30, 600);
        return checkout.capture(r.orderNumber(), r.paypalOrderId(), me == null ? null : me.id(), cartToken);
    }

    @PostMapping("/paypal/cancel")
    public Map<String, String> cancel(@Valid @RequestBody PayPalOrderRequest r, HttpServletRequest req) {
        limiter.check(req, "paypal-cancel", 30, 600);
        checkout.cancel(r.orderNumber(), r.paypalOrderId());
        return Map.of("message", "Your PayPal checkout was cancelled. Your bag is just as you left it.");
    }

    /**
     * PayPal webhook (Developer dashboard → app → Webhooks → https://YOUR-API/api/payments/paypal/webhook).
     * Each delivery is verified with PayPal before anything changes.
     */
    @PostMapping("/paypal/webhook")
    public ResponseEntity<Void> webhook(@RequestHeader HttpHeaders headers, @RequestBody String body) {
        if (!paypal.webhooksEnabled()) return ResponseEntity.status(503).build();
        if (body.length() > 200_000) return ResponseEntity.status(413).build();
        Map<String, String> h = new HashMap<>();
        headers.forEach((k, v) -> { if (!v.isEmpty()) h.put(k.toLowerCase(), v.get(0)); });
        if (!checkout.verifyWebhook(h, body)) {
            log.warn("Rejected a PayPal webhook with an invalid signature");
            return ResponseEntity.badRequest().build();
        }
        checkout.handleWebhook(body);
        return ResponseEntity.ok().build();
    }
}
