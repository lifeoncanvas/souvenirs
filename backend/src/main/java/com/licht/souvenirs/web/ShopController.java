package com.licht.souvenirs.web;

import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.security.AuthUser;
import com.licht.souvenirs.security.CaptchaService;
import com.licht.souvenirs.security.RateLimiter;
import com.licht.souvenirs.service.CartService;
import com.licht.souvenirs.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Cart and checkout. Guests identify their cart with the X-Cart-Token header. */
@RestController
@RequestMapping("/api")
public class ShopController {
    private static final String CART = "X-Cart-Token";

    private final CartService carts;
    private final OrderService orders;
    private final RateLimiter limiter;
    private final CaptchaService captcha;

    public ShopController(CartService carts, OrderService orders, RateLimiter limiter, CaptchaService captcha) {
        this.carts = carts;
        this.orders = orders;
        this.limiter = limiter;
        this.captcha = captcha;
    }

    private static Long uid(AuthUser me) {
        return me == null ? null : me.id();
    }

    @GetMapping("/cart")
    public CartDto cart(@AuthenticationPrincipal AuthUser me, @RequestHeader(value = CART, required = false) String token,
                        @RequestParam(required = false) String shippingMethod) {
        if (shippingMethod != null && !shippingMethod.matches("STANDARD|EXPRESS|COLLECTION")) shippingMethod = null;
        return carts.view(uid(me), token, shippingMethod);
    }

    @PostMapping("/cart/items")
    public CartDto add(@AuthenticationPrincipal AuthUser me, @RequestHeader(value = CART, required = false) String token,
                       @Valid @RequestBody AddToCartRequest r) {
        return carts.add(uid(me), token, r);
    }

    @PatchMapping("/cart/items/{id}")
    public CartDto update(@AuthenticationPrincipal AuthUser me, @RequestHeader(value = CART, required = false) String token,
                          @PathVariable Long id, @Valid @RequestBody UpdateCartItemRequest r) {
        return carts.updateQuantity(uid(me), token, id, r.quantity());
    }

    @DeleteMapping("/cart/items/{id}")
    public CartDto remove(@AuthenticationPrincipal AuthUser me, @RequestHeader(value = CART, required = false) String token,
                          @PathVariable Long id) {
        return carts.remove(uid(me), token, id);
    }

    @PostMapping("/cart/coupon")
    public CartDto coupon(@AuthenticationPrincipal AuthUser me, @RequestHeader(value = CART, required = false) String token,
                          @Valid @RequestBody CouponRequest r, HttpServletRequest req) {
        limiter.check(req, "coupon", 30, 600);
        return carts.applyCoupon(uid(me), token, r.code());
    }

    @DeleteMapping("/cart/coupon")
    public CartDto removeCoupon(@AuthenticationPrincipal AuthUser me,
                                @RequestHeader(value = CART, required = false) String token) {
        return carts.removeCoupon(uid(me), token);
    }

    @PostMapping("/checkout")
    public CheckoutResponse checkout(@AuthenticationPrincipal AuthUser me,
                                     @RequestHeader(value = CART, required = false) String token,
                                     @Valid @RequestBody CheckoutRequest r, HttpServletRequest req) {
        limiter.check(req, "checkout", 10, 600);
        captcha.verify(r.captchaToken(), req);
        return orders.checkout(uid(me), token, r);
    }

    @PostMapping("/orders/track")
    public OrderDto track(@Valid @RequestBody TrackOrderRequest r, HttpServletRequest req) {
        limiter.check(req, "track", 20, 600);
        return orders.track(r.orderNumber(), r.email());
    }
}
