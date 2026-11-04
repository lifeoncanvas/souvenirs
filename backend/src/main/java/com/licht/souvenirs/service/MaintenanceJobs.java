package com.licht.souvenirs.service;

import com.licht.souvenirs.repo.Repositories.CartRepository;
import com.licht.souvenirs.repo.Repositories.OrderItemRepository;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Background housekeeping: releases unpaid stock, and deletes stale guest bags and unused logo uploads. */
@Component
public class MaintenanceJobs {
    private static final Logger log = LoggerFactory.getLogger(MaintenanceJobs.class);

    private final OrderService orders;
    private final CartRepository carts;
    private final OrderItemRepository orderItems;
    private final StorageService storage;
    private final Duration guestCartAge;
    private final Duration orphanLogoAge;

    public MaintenanceJobs(OrderService orders, CartRepository carts, OrderItemRepository orderItems,
                           StorageService storage,
                           @Value("${app.orders.guest-cart-days}") long guestCartDays,
                           @Value("${app.storage.orphan-logo-hours}") long orphanLogoHours) {
        this.orders = orders;
        this.carts = carts;
        this.orderItems = orderItems;
        this.storage = storage;
        this.guestCartAge = Duration.ofDays(guestCartDays);
        this.orphanLogoAge = Duration.ofHours(orphanLogoHours);
    }

    @Scheduled(initialDelay = 60_000, fixedDelay = 300_000)
    public void expireUnpaidOrders() {
        for (Long id : orders.expiredUnpaidOrderIds()) {
            try {
                orders.expire(id);
            } catch (Exception e) {
                log.warn("Could not expire order {}: {}", id, e.getMessage());
            }
        }
    }

    @Scheduled(initialDelay = 120_000, fixedDelay = 21_600_000)
    @Transactional
    public void purgeGuestCarts() {
        Instant cutoff = Instant.now().minus(guestCartAge);
        carts.deleteGuestItemsCreatedBefore(cutoff);
        int n = carts.deleteGuestCartsCreatedBefore(cutoff);
        if (n > 0) log.info("Deleted {} guest bags older than {} days", n, guestCartAge.toDays());
    }

    @Scheduled(initialDelay = 180_000, fixedDelay = 3_600_000)
    public void purgeOrphanLogos() {
        for (String url : storage.filesOlderThan("logos", Instant.now().minus(orphanLogoAge))) {
            String name = url.substring(url.lastIndexOf('/') + 1);
            if (!carts.anyItemMentions(name) && !orderItems.anyItemMentions(name)) storage.delete(url, "logos");
        }
    }
}
