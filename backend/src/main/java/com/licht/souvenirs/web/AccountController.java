package com.licht.souvenirs.web;

import com.licht.souvenirs.domain.Address;
import com.licht.souvenirs.domain.WishlistItem;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.*;
import com.licht.souvenirs.security.AuthUser;
import com.licht.souvenirs.service.AuthService;
import com.licht.souvenirs.service.Mapper;
import com.licht.souvenirs.service.OrderService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

/** Signed-in customer area. Every route requires authentication (see SecurityConfig). */
@RestController
@RequestMapping("/api/account")
public class AccountController {
    private final AuthService auth;
    private final OrderService orders;
    private final AddressRepository addresses;
    private final WishlistRepository wishlist;
    private final ProductRepository products;
    private final UserRepository users;
    private final Mapper mapper;

    public AccountController(AuthService auth, OrderService orders, AddressRepository addresses,
                             WishlistRepository wishlist, ProductRepository products, UserRepository users,
                             Mapper mapper) {
        this.auth = auth;
        this.orders = orders;
        this.addresses = addresses;
        this.wishlist = wishlist;
        this.products = products;
        this.users = users;
        this.mapper = mapper;
    }

    @GetMapping("/profile")
    public UserDto profile(@AuthenticationPrincipal AuthUser me) {
        return auth.me(me.id());
    }

    @PutMapping("/profile")
    public UserDto updateProfile(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ProfileUpdate r) {
        return auth.updateProfile(me.id(), r);
    }

    @PostMapping("/password")
    public Map<String, String> changePassword(@AuthenticationPrincipal AuthUser me,
                                              @Valid @RequestBody ChangePasswordRequest r) {
        // Other sessions are signed out; this one continues with the fresh token.
        AuthResponse fresh = auth.changePassword(me.id(), r);
        return Map.of("message", "Your password has been updated. Other devices have been signed out.",
                "token", fresh.token());
    }

    // ----- Addresses -----

    @GetMapping("/addresses")
    @Transactional(readOnly = true)
    public List<AddressDto> addresses(@AuthenticationPrincipal AuthUser me) {
        return addresses.findByUserIdOrderByDefaultAddressDescIdAsc(me.id()).stream().map(mapper::address).toList();
    }

    @PostMapping("/addresses")
    @Transactional
    public AddressDto addAddress(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody AddressDto r) {
        Address a = new Address();
        a.setUser(users.getReferenceById(me.id()));
        return saveAddress(me.id(), a, r);
    }

    @PutMapping("/addresses/{id}")
    @Transactional
    public AddressDto updateAddress(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                                    @Valid @RequestBody AddressDto r) {
        Address a = addresses.findByIdAndUserId(id, me.id()).orElseThrow(() -> ApiException.notFound("Address"));
        return saveAddress(me.id(), a, r);
    }

    @DeleteMapping("/addresses/{id}")
    @Transactional
    public void deleteAddress(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        addresses.delete(addresses.findByIdAndUserId(id, me.id()).orElseThrow(() -> ApiException.notFound("Address")));
    }

    private AddressDto saveAddress(Long userId, Address a, AddressDto r) {
        List<Address> existing = addresses.findByUserIdOrderByDefaultAddressDescIdAsc(userId);
        boolean makeDefault = r.isDefault() || existing.isEmpty() || (existing.size() == 1 && existing.contains(a));
        if (makeDefault) existing.forEach(x -> x.setDefaultAddress(false));
        a.setLabel(r.label());
        a.setFullName(r.fullName());
        a.setPhone(r.phone());
        a.setLine1(r.line1());
        a.setLine2(r.line2());
        a.setCity(r.city());
        a.setRegion(r.region());
        a.setPostalCode(r.postalCode());
        a.setCountry(r.country());
        a.setDefaultAddress(makeDefault || a.isDefaultAddress());
        return mapper.address(addresses.save(a));
    }

    // ----- Orders -----

    @GetMapping("/orders")
    public List<OrderDto> orders(@AuthenticationPrincipal AuthUser me) {
        return orders.forUser(me.id());
    }

    @GetMapping("/orders/{orderNumber}")
    public OrderDto order(@AuthenticationPrincipal AuthUser me, @PathVariable String orderNumber) {
        return orders.forUser(me.id(), orderNumber);
    }

    // ----- Wishlist -----

    @GetMapping("/wishlist")
    @Transactional(readOnly = true)
    public List<ProductSummary> wishlist(@AuthenticationPrincipal AuthUser me) {
        return wishlist.findByUserIdOrderByCreatedAtDesc(me.id()).stream()
                .map(WishlistItem::getProduct).filter(p -> p.isActive()).map(mapper::summary).toList();
    }

    @PostMapping("/wishlist/{productId}")
    @Transactional
    public Map<String, Object> addToWishlist(@AuthenticationPrincipal AuthUser me, @PathVariable Long productId) {
        if (wishlist.findByUserIdAndProductId(me.id(), productId).isEmpty()) {
            var p = products.findById(productId).orElseThrow(() -> ApiException.notFound("Product"));
            wishlist.save(new WishlistItem(users.getReferenceById(me.id()), p));
        }
        return Map.of("productId", productId, "saved", true);
    }

    @DeleteMapping("/wishlist/{productId}")
    @Transactional
    public Map<String, Object> removeFromWishlist(@AuthenticationPrincipal AuthUser me, @PathVariable Long productId) {
        wishlist.findByUserIdAndProductId(me.id(), productId).ifPresent(wishlist::delete);
        return Map.of("productId", productId, "saved", false);
    }
}
