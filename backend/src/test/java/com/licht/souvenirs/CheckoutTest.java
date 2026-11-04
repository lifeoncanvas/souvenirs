package com.licht.souvenirs;

import static org.assertj.core.api.Assertions.assertThat;

import com.licht.souvenirs.domain.Coupon;
import com.licht.souvenirs.domain.Order;
import com.licht.souvenirs.repo.Repositories.CartRepository;
import com.licht.souvenirs.repo.Repositories.CouponRepository;
import com.licht.souvenirs.repo.Repositories.OrderRepository;
import com.licht.souvenirs.service.MaintenanceJobs;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;

class CheckoutTest extends ApiTestSupport {
    @Autowired CartRepository carts;
    @Autowired OrderRepository orders;
    @Autowired CouponRepository coupons;
    @Autowired MaintenanceJobs jobs;

    @Test
    void viewingTheBagWithoutATokenCreatesNothing() throws Exception {
        long before = carts.count();
        for (int i = 0; i < 5; i++) {
            Res r = get("/api/cart", null);
            assertThat(r.status()).isEqualTo(200);
            assertThat(r.body().get("items")).isEmpty();
        }
        assertThat(carts.count()).isEqualTo(before);
    }

    @Test
    void checkoutReservesStockAndRefusesOverselling() throws Exception {
        var p = product("25.00", 3);
        String bag = addToCart(p, 3, null, null);
        Res first = checkout(bag, null, "BANK_TRANSFER");
        assertThat(first.status()).isEqualTo(200);
        assertThat(stockOf(p)).isZero();

        assertThat(call(HttpMethod.POST, "/api/cart/items", Map.of("productId", p.getId(), "quantity", 1), null, null).status())
                .isEqualTo(400);
        // The paid-for bag was emptied.
        assertThat(checkout(bag, null, "BANK_TRANSFER").body().get("message").asText()).contains("empty");
    }

    @Test
    void quantityPerProductIsCapped() throws Exception {
        var p = product("5.00", 500);
        Res r = call(HttpMethod.POST, "/api/cart/items", Map.of("productId", p.getId(), "quantity", 21), null, null);
        assertThat(r.status()).isEqualTo(400);
        assertThat(r.body().get("message").asText()).contains("bulk");
    }

    @Test
    void unpaidOrdersExpireAndReturnTheirStock() throws Exception {
        var p = product("40.00", 4);
        String bag = addToCart(p, 4, null, null);
        Res r = checkout(bag, null, "PAY_ON_CONFIRMATION");
        assertThat(stockOf(p)).isZero();

        Order o = orders.findByOrderNumber(r.body().path("order").path("orderNumber").asText()).orElseThrow();
        o.setExpiresAt(Instant.now().minusSeconds(60));
        orders.save(o);
        jobs.expireUnpaidOrders();

        Order after = orders.findByOrderNumber(o.getOrderNumber()).orElseThrow();
        assertThat(after.getStatus()).isEqualTo(Order.Status.CANCELLED);
        assertThat(stockOf(p)).isEqualTo(4);
    }

    @Test
    void confirmedOrdersDoNotExpire() throws Exception {
        var p = product("40.00", 2);
        Res r = checkout(addToCart(p, 2, null, null), null, "BANK_TRANSFER");
        Order o = orders.findByOrderNumber(r.body().path("order").path("orderNumber").asText()).orElseThrow();
        o.setStatus(Order.Status.CONFIRMED);
        o.setExpiresAt(Instant.now().minusSeconds(60));
        orders.save(o);
        jobs.expireUnpaidOrders();
        assertThat(orders.findById(o.getId()).orElseThrow().getStatus()).isEqualTo(Order.Status.CONFIRMED);
        assertThat(stockOf(p)).isZero();
    }

    @Test
    void couponUsageLimitIsEnforcedAtCheckout() throws Exception {
        Coupon c = new Coupon();
        c.setCode(unique("ONCE").toUpperCase());
        c.setType(Coupon.Type.FIXED);
        c.setAmount(new BigDecimal("5.00"));
        c.setUsageLimit(1);
        coupons.save(c);
        var p = product("30.00", 10);

        String bagA = addToCart(p, 1, null, null);
        String bagB = addToCart(p, 1, null, null);
        assertThat(call(HttpMethod.POST, "/api/cart/coupon", Map.of("code", c.getCode()), null, bagA).status()).isEqualTo(200);
        assertThat(call(HttpMethod.POST, "/api/cart/coupon", Map.of("code", c.getCode()), null, bagB).status()).isEqualTo(200);

        assertThat(checkout(bagA, null, "BANK_TRANSFER").status()).isEqualTo(200);
        Res second = checkout(bagB, null, "BANK_TRANSFER");
        assertThat(second.status()).isEqualTo(400);
        assertThat(second.body().get("message").asText()).contains("usage limit");
    }

    @Test
    void customersOnlySeeTheirOwnOrdersAndAddresses() throws Exception {
        String alice = register(unique("alice") + "@test.local");
        String bob = register(unique("bob") + "@test.local");
        var p = product("12.00", 5);
        addToCart(p, 1, alice, null);
        String number = checkout(null, alice, "BANK_TRANSFER").body().path("order").path("orderNumber").asText();

        assertThat(get("/api/account/orders/" + number, alice).status()).isEqualTo(200);
        assertThat(get("/api/account/orders/" + number, bob).status()).isEqualTo(404);

        Map<String, Object> addr = Map.of("fullName", "A", "line1", "1 Road", "city", "Leeds", "postalCode", "LS1",
                "country", "UK", "isDefault", true);
        long id = post("/api/account/addresses", addr, alice).body().get("id").asLong();
        assertThat(call(HttpMethod.PUT, "/api/account/addresses/" + id, addr, bob, null).status()).isEqualTo(404);
        assertThat(call(HttpMethod.DELETE, "/api/account/addresses/" + id, null, bob, null).status()).isEqualTo(404);
    }

    @Test
    void logoPersonalisationOnlyAcceptsOurOwnUploads() throws Exception {
        var p = product("15.00", 5);
        var pz = new com.licht.souvenirs.domain.ProductPersonalisation();
        pz.setEnabled(true);
        pz.setAllowLogo(true);
        p.setPersonalisation(pz);
        products.save(p);
        Map<String, Object> bad = Map.of("productId", p.getId(), "quantity", 1,
                "personalisation", Map.of("logoUrl", "/uploads/logos/../products/x.png"));
        assertThat(call(HttpMethod.POST, "/api/cart/items", bad, null, null).status()).isEqualTo(400);
        Map<String, Object> good = Map.of("productId", p.getId(), "quantity", 1,
                "personalisation", Map.of("logoUrl", "/uploads/logos/0f8fad5b-d9cb-469f-a165-70867728950e.png"));
        assertThat(call(HttpMethod.POST, "/api/cart/items", good, null, null).status()).isEqualTo(200);
    }
}
