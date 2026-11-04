package com.licht.souvenirs.service;

import com.licht.souvenirs.domain.*;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.CartRepository;
import com.licht.souvenirs.repo.Repositories.CouponRepository;
import com.licht.souvenirs.repo.Repositories.ProductRepository;
import com.licht.souvenirs.repo.Repositories.UserRepository;
import com.licht.souvenirs.web.ApiException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CartService {
    private final CartRepository carts;
    private final ProductRepository products;
    private final CouponRepository coupons;
    private final UserRepository users;
    private final Mapper mapper;
    private final StorageService storage;
    private final int maxQuantityPerProduct;
    private final BigDecimal standardFee;
    private final BigDecimal expressFee;
    private final BigDecimal freeThreshold;

    public CartService(CartRepository carts, ProductRepository products, CouponRepository coupons,
                       UserRepository users, Mapper mapper, StorageService storage,
                       @Value("${app.orders.max-quantity-per-product}") int maxQuantityPerProduct,
                       @Value("${app.shipping.standard-fee}") BigDecimal standardFee,
                       @Value("${app.shipping.express-fee}") BigDecimal expressFee,
                       @Value("${app.shipping.free-threshold}") BigDecimal freeThreshold) {
        this.carts = carts;
        this.products = products;
        this.coupons = coupons;
        this.users = users;
        this.mapper = mapper;
        this.storage = storage;
        this.maxQuantityPerProduct = maxQuantityPerProduct;
        this.standardFee = standardFee;
        this.expressFee = expressFee;
        this.freeThreshold = freeThreshold;
    }

    /** Totals for a cart, shared by the cart view and checkout. */
    public record Totals(BigDecimal subtotal, BigDecimal discount, BigDecimal shipping, BigDecimal total,
                         Coupon coupon, String couponError) {}

    /** The caller's existing cart, if any, without creating one. */
    @Transactional(readOnly = true)
    public Optional<Cart> find(Long userId, String token) {
        if (userId != null) return carts.findByUserId(userId);
        if (token == null || token.isBlank()) return Optional.empty();
        return carts.findByToken(token).filter(c -> c.getUser() == null);
    }

    /**
     * Resolves the caller's cart for a change: the user's own cart when signed in, else the guest cart
     * for the token, creating it when missing. Read-only paths use {@link #find} so that merely
     * viewing the shop never writes a row.
     */
    @Transactional
    public Cart resolve(Long userId, String token) {
        if (userId != null) {
            return carts.findByUserId(userId).orElseGet(() -> {
                Cart c = new Cart();
                c.setToken(UUID.randomUUID().toString());
                c.setUser(users.getReferenceById(userId));
                return carts.save(c);
            });
        }
        if (token != null && !token.isBlank()) {
            var existing = carts.findByToken(token).filter(c -> c.getUser() == null);
            if (existing.isPresent()) return existing.get();
        }
        Cart c = new Cart();
        c.setToken(UUID.randomUUID().toString());
        return carts.save(c);
    }

    @Transactional
    public CartDto view(Long userId, String token, String shippingMethod) {
        return toDto(find(userId, token).orElseGet(Cart::new), shippingMethod);
    }

    @Transactional
    public CartDto add(Long userId, String token, AddToCartRequest r) {
        Cart cart = resolve(userId, token);
        Product p = products.findById(r.productId()).filter(Product::isActive)
                .orElseThrow(() -> ApiException.notFound("Product"));
        String pjson = mapper.writeMap(cleanPersonalisation(p, r.personalisation()));
        CartItem item = cart.getItems().stream()
                .filter(i -> i.getProduct().getId().equals(p.getId()) && Objects.equals(i.getPersonalisationJson(), pjson))
                .findFirst().orElse(null);
        int newQty = (item == null ? 0 : item.getQuantity()) + r.quantity();
        ensureStock(p, newQty + otherLinesQty(cart, p, item));
        if (item == null) {
            item = new CartItem();
            item.setCart(cart);
            item.setProduct(p);
            item.setPersonalisationJson(pjson);
            cart.getItems().add(item);
        }
        item.setQuantity(newQty);
        carts.save(cart);
        return toDto(cart, null);
    }

    @Transactional
    public CartDto updateQuantity(Long userId, String token, Long itemId, int qty) {
        Cart cart = find(userId, token).orElseThrow(() -> ApiException.notFound("Cart item"));
        CartItem item = cart.getItems().stream().filter(i -> i.getId().equals(itemId)).findFirst()
                .orElseThrow(() -> ApiException.notFound("Cart item"));
        ensureStock(item.getProduct(), qty + otherLinesQty(cart, item.getProduct(), item));
        item.setQuantity(qty);
        return toDto(cart, null);
    }

    @Transactional
    public CartDto remove(Long userId, String token, Long itemId) {
        Cart cart = find(userId, token).orElseGet(Cart::new);
        cart.getItems().removeIf(i -> i.getId().equals(itemId));
        return toDto(cart, null);
    }

    @Transactional
    public CartDto applyCoupon(Long userId, String token, String code) {
        Cart cart = resolve(userId, token);
        Coupon c = coupons.findByCodeIgnoreCase(code.trim())
                .orElseThrow(() -> ApiException.badRequest("We don't recognise that code."));
        String reason = c.rejectionReason(subtotal(cart));
        if (reason != null) throw ApiException.badRequest(reason);
        cart.setCouponCode(c.getCode());
        return toDto(cart, null);
    }

    @Transactional
    public CartDto removeCoupon(Long userId, String token) {
        Cart cart = find(userId, token).orElseGet(Cart::new);
        cart.setCouponCode(null);
        return toDto(cart, null);
    }

    /** Empties the caller's cart once its order is paid for. */
    @Transactional
    public void clear(Long userId, String token) {
        find(userId, token).ifPresent(c -> {
            c.getItems().clear();
            c.setCouponCode(null);
        });
    }

    /** On sign-in, folds the guest cart's lines into the user's cart. */
    @Transactional
    public void attachGuestCart(String token, User user) {
        if (token == null || token.isBlank()) return;
        carts.findByToken(token).filter(c -> c.getUser() == null).ifPresent(guest -> {
            Cart mine = resolve(user.getId(), null);
            for (CartItem gi : guest.getItems()) {
                CartItem match = mine.getItems().stream()
                        .filter(i -> i.getProduct().getId().equals(gi.getProduct().getId())
                                && Objects.equals(i.getPersonalisationJson(), gi.getPersonalisationJson()))
                        .findFirst().orElse(null);
                if (match != null) {
                    match.setQuantity(Math.min(match.getQuantity() + gi.getQuantity(), Math.max(gi.getProduct().getStock(), 1)));
                } else {
                    CartItem copy = new CartItem();
                    copy.setCart(mine);
                    copy.setProduct(gi.getProduct());
                    copy.setQuantity(gi.getQuantity());
                    copy.setPersonalisationJson(gi.getPersonalisationJson());
                    mine.getItems().add(copy);
                }
            }
            if (mine.getCouponCode() == null) mine.setCouponCode(guest.getCouponCode());
            carts.delete(guest);
        });
    }

    public BigDecimal unitPrice(CartItem i) {
        BigDecimal price = i.getProduct().getPrice();
        ProductPersonalisation pp = i.getProduct().getPersonalisation();
        if (i.getPersonalisationJson() != null && pp != null && pp.getExtraCost() != null) {
            price = price.add(pp.getExtraCost());
        }
        return price;
    }

    public BigDecimal subtotal(Cart cart) {
        return cart.getItems().stream()
                .map(i -> unitPrice(i).multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add).setScale(2, RoundingMode.HALF_UP);
    }

    public Totals totals(Cart cart, String shippingMethod) {
        BigDecimal subtotal = subtotal(cart);
        Coupon coupon = null;
        String couponError = null;
        BigDecimal discount = BigDecimal.ZERO;
        if (cart.getCouponCode() != null) {
            coupon = coupons.findByCodeIgnoreCase(cart.getCouponCode()).orElse(null);
            couponError = coupon == null ? "This code is no longer available." : coupon.rejectionReason(subtotal);
            if (couponError == null) discount = coupon.discountFor(subtotal);
            else coupon = null;
        }
        BigDecimal afterDiscount = subtotal.subtract(discount);
        BigDecimal shipping = shippingFee(afterDiscount, shippingMethod, cart.getItems().isEmpty());
        return new Totals(subtotal, discount, shipping, afterDiscount.add(shipping).setScale(2, RoundingMode.HALF_UP),
                coupon, couponError);
    }

    private BigDecimal shippingFee(BigDecimal amount, String method, boolean empty) {
        if (empty) return BigDecimal.ZERO.setScale(2);
        String m = method == null ? "STANDARD" : method;
        return switch (m) {
            case "COLLECTION" -> BigDecimal.ZERO.setScale(2);
            case "EXPRESS" -> expressFee.setScale(2, RoundingMode.HALF_UP);
            default -> amount.compareTo(freeThreshold) >= 0 ? BigDecimal.ZERO.setScale(2)
                    : standardFee.setScale(2, RoundingMode.HALF_UP);
        };
    }

    private CartDto toDto(Cart cart, String shippingMethod) {
        Totals t = totals(cart, shippingMethod);
        List<CartItemDto> items = cart.getItems().stream().map(i -> {
            Product p = i.getProduct();
            BigDecimal unit = unitPrice(i);
            String img = p.getImages().isEmpty() ? null : p.getImages().get(0).getUrl();
            return new CartItemDto(i.getId(), p.getId(), p.getSlug(), p.getName(), img, unit, i.getQuantity(),
                    unit.multiply(BigDecimal.valueOf(i.getQuantity())).setScale(2, RoundingMode.HALF_UP),
                    p.getStock(), mapper.readMap(i.getPersonalisationJson()));
        }).toList();
        int count = cart.getItems().stream().mapToInt(CartItem::getQuantity).sum();
        return new CartDto(cart.getToken(), items, count, t.subtotal(), cart.getCouponCode(), t.discount(),
                t.shipping(), t.total(), shippingMethod == null ? "STANDARD" : shippingMethod, freeThreshold,
                t.couponError());
    }

    private static int otherLinesQty(Cart cart, Product p, CartItem except) {
        return cart.getItems().stream()
                .filter(i -> i != except && i.getProduct().getId().equals(p.getId()))
                .mapToInt(CartItem::getQuantity).sum();
    }

    void ensureStock(Product p, int qty) {
        if (qty > maxQuantityPerProduct) {
            throw ApiException.badRequest("Orders are limited to " + maxQuantityPerProduct + " of " + p.getName()
                    + ". For larger quantities, please send us a bulk order enquiry.");
        }
        if (qty > p.getStock()) {
            throw ApiException.badRequest(p.getStock() <= 0
                    ? p.getName() + " is currently out of stock."
                    : "Only " + p.getStock() + " of " + p.getName() + " available.");
        }
    }

    /**
     * Keeps only the personalisation fields this product supports, trimmed and length-checked.
     * Returns null when the product is not personalisable or nothing was entered.
     */
    Map<String, String> cleanPersonalisation(Product p, Map<String, String> in) {
        if (in == null || in.isEmpty()) return null;
        ProductPersonalisation cfg = p.getPersonalisation();
        if (cfg == null || !cfg.isEnabled()) return null;
        Map<String, String> out = new LinkedHashMap<>();
        put(out, in, "name", cfg.isAllowName(), 60, "Name");
        put(out, in, "initials", cfg.isAllowInitials(), 6, "Initials");
        put(out, in, "date", cfg.isAllowDate(), 40, "Date");
        put(out, in, "message", cfg.isAllowMessage(), cfg.getMessageMaxLength(), "Message");
        put(out, in, "eventDetails", cfg.isAllowEventDetails(), 300, "Event details");
        put(out, in, "instructions", cfg.isAllowInstructions(), 500, "Special instructions");
        if (cfg.isAllowLogo()) {
            String logo = in.get("logoUrl");
            if (logo != null && !logo.isBlank()) {
                if (!storage.isStoredUrl(logo, "logos")) throw ApiException.badRequest("Please upload your logo again.");
                out.put("logoUrl", logo);
            }
        }
        return out.isEmpty() ? null : out;
    }

    private static void put(Map<String, String> out, Map<String, String> in, String key, boolean allowed,
                            int max, String label) {
        String v = in.get(key);
        if (!allowed || v == null || v.isBlank()) return;
        v = v.trim();
        if (v.length() > max) throw ApiException.badRequest(label + " must be " + max + " characters or fewer.");
        out.put(key, v);
    }
}
