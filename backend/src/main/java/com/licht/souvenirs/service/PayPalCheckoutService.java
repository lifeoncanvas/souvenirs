package com.licht.souvenirs.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.licht.souvenirs.domain.Order;
import com.licht.souvenirs.domain.Payment;
import com.licht.souvenirs.dto.Dtos.CheckoutResponse;
import com.licht.souvenirs.dto.Dtos.OrderDto;
import com.licht.souvenirs.repo.Repositories.OrderRepository;
import com.licht.souvenirs.repo.Repositories.PaymentRepository;
import com.licht.souvenirs.service.PayPalClient.Capture;
import com.licht.souvenirs.service.PayPalClient.PayPalException;
import com.licht.souvenirs.web.ApiException;
import java.math.BigDecimal;
import java.util.Map;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * PayPal checkout, after {@link OrderService#checkout} has reserved stock and created the PayPal order:
 * the browser approves it, then the server captures it here. Webhooks repeat the outcome so a buyer who
 * closes the window after approving is still charged and confirmed exactly once.
 *
 * <p>Every path locks the order row, so capture, webhooks and the expiry job are serialised: an order
 * the expiry job cancelled is never captured, and a captured order is never cancelled.
 */
@Service
public class PayPalCheckoutService {
    private static final Logger log = LoggerFactory.getLogger(PayPalCheckoutService.class);

    private final PayPalClient paypal;
    private final PaymentService payments;
    private final OrderService orderService;
    private final OrderRepository orders;
    private final PaymentRepository paymentRepo;
    private final CartService carts;
    private final EmailService email;
    private final Mapper mapper;
    private final ObjectMapper json;

    public PayPalCheckoutService(PayPalClient paypal, PaymentService payments, OrderService orderService,
                                 OrderRepository orders, PaymentRepository paymentRepo, CartService carts,
                                 EmailService email, Mapper mapper, ObjectMapper json) {
        this.paypal = paypal;
        this.payments = payments;
        this.orderService = orderService;
        this.orders = orders;
        this.paymentRepo = paymentRepo;
        this.carts = carts;
        this.email = email;
        this.mapper = mapper;
        this.json = json;
    }

    /** Captures the buyer-approved PayPal order and confirms ours. Safe to call more than once. */
    @Transactional
    public CheckoutResponse capture(String orderNumber, String paypalOrderId, Long userId, String cartToken) {
        Order o = lockOrder(orderNumber, paypalOrderId);
        if (o.getPaymentStatus() != Order.PaymentStatus.PAID) {
            if (o.getStatus() == Order.Status.CANCELLED) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "This checkout expired before payment was completed, so no money was taken. Please check out again.",
                        "ORDER_EXPIRED");
            }
            Capture c;
            try {
                c = paypal.capture(paypalOrderId);
            } catch (PayPalException e) {
                if ("INSTRUMENT_DECLINED".equals(e.getIssue())) {
                    throw new ApiException(HttpStatus.PAYMENT_REQUIRED,
                            "PayPal declined that payment method. Please choose another one.", "INSTRUMENT_DECLINED");
                }
                throw new ApiException(HttpStatus.BAD_GATEWAY,
                        "We could not complete the PayPal payment. You have not been charged; please try again.");
            }
            apply(o, c, "checkout");
            if (o.getPaymentStatus() == Order.PaymentStatus.FAILED) {
                throw new ApiException(HttpStatus.PAYMENT_REQUIRED,
                        "PayPal declined the payment. Please try again or choose another payment method.", "CAPTURE_DECLINED");
            }
        }
        // Paid (or awaiting PayPal's review): the bag has become this order.
        carts.clear(userId, cartToken);
        return new CheckoutResponse(mapper.customerOrder(o), instructions(o), paypalOrderId);
    }

    /** The buyer closed or cancelled the PayPal window: release the reservation now instead of waiting for expiry. */
    @Transactional
    public void cancel(String orderNumber, String paypalOrderId) {
        Order o = lockOrder(orderNumber, paypalOrderId);
        if (o.getStatus() != Order.Status.PENDING || o.getPaymentStatus() == Order.PaymentStatus.PAID) return;
        // If PayPal already took the money (approval raced the cancel), keep the order.
        try {
            Capture c = paypal.getOrder(paypalOrderId);
            if (c.completed() || c.pending()) {
                apply(o, c, "cancel-check");
                return;
            }
        } catch (PayPalException e) {
            log.warn("Could not check PayPal order {} before cancelling: {}", paypalOrderId, e.getMessage());
            return; // the expiry job will release it later
        }
        orderService.cancelUnpaid(o, "PayPal checkout was cancelled by the customer");
    }

    /** Handles a verified webhook event. Unknown event types are acknowledged and ignored. */
    @Transactional
    public void handleWebhook(String rawBody) {
        JsonNode event;
        try {
            event = json.readTree(rawBody);
        } catch (Exception e) {
            return;
        }
        String type = event.path("event_type").asText("");
        JsonNode res = event.path("resource");
        switch (type) {
            case "CHECKOUT.ORDER.APPROVED" -> {
                // The buyer approved but our capture call may never have arrived (closed tab, lost network).
                String paypalOrderId = res.path("id").asText(null);
                findByPayPalOrder(paypalOrderId).ifPresent(o -> {
                    if (o.getPaymentStatus() == Order.PaymentStatus.PAID || o.getStatus() != Order.Status.PENDING) return;
                    try {
                        apply(o, paypal.capture(paypalOrderId), "webhook");
                    } catch (PayPalException e) {
                        log.warn("Webhook capture of PayPal order {} failed: {}", paypalOrderId, e.getMessage());
                    }
                });
            }
            case "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.DECLINED" -> {
                String paypalOrderId = res.path("supplementary_data").path("related_ids").path("order_id").asText(null);
                Optional<Order> order = findByPayPalOrder(paypalOrderId);
                if (order.isEmpty()) order = findByCapture(res.path("id").asText(null));
                order.ifPresent(o -> {
                    Capture c = new Capture(null, res.path("id").asText(null), res.path("status").asText(null),
                            decimal(res.path("amount").path("value").asText(null)), res.path("amount").path("currency_code").asText(null),
                            res.path("custom_id").asText(null));
                    apply(o, c, "webhook");
                });
            }
            case "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED" -> {
                String captureId = "PAYMENT.CAPTURE.REVERSED".equals(type) ? res.path("id").asText(null) : upLink(res);
                findByCapture(captureId).ifPresent(o -> {
                    if (o.getPaymentStatus() == Order.PaymentStatus.REFUNDED) return;
                    markRefunded(o, captureId, "PAYMENT.CAPTURE.REVERSED".equals(type)
                            ? "PayPal reversed the payment (dispute or chargeback)."
                            : "Refund of " + res.path("amount").path("value").asText("?") + " "
                                    + res.path("amount").path("currency_code").asText("") + " recorded by PayPal.");
                    email.notifyAdmin("PayPal " + ("PAYMENT.CAPTURE.REVERSED".equals(type) ? "reversal" : "refund")
                                    + " for order " + o.getOrderNumber(),
                            "Order " + o.getOrderNumber() + " is now marked refunded. Review it in the admin dashboard.");
                });
            }
            default -> log.debug("Ignoring PayPal webhook event {}", type);
        }
    }

    /** Admin: refunds the order's PayPal capture in full. */
    @Transactional
    public OrderDto refund(Long orderId) {
        Order o = orders.lockById(orderId).orElseThrow(() -> ApiException.notFound("Order"));
        Payment p = paypalPayment(o).filter(x -> x.getCaptureReference() != null)
                .orElseThrow(() -> ApiException.badRequest("This order has no PayPal payment to refund."));
        if (o.getPaymentStatus() == Order.PaymentStatus.REFUNDED) return mapper.order(o);
        if (o.getPaymentStatus() != Order.PaymentStatus.PAID) throw ApiException.badRequest("Only paid orders can be refunded.");
        String status;
        try {
            status = paypal.refund(p.getCaptureReference(), "refund-" + o.getOrderNumber());
        } catch (PayPalException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "PayPal refused the refund: " + e.getMessage());
        }
        markRefunded(o, p.getCaptureReference(), "Full refund issued from the admin dashboard (PayPal status " + status + ").");
        email.send(o.getEmail(), "Refund for order " + o.getOrderNumber(),
                "Dear " + o.getCustomerName() + ",\n\nWe have refunded " + o.getTotal() + " " + payments.currency()
                        + " for order " + o.getOrderNumber() + " to your PayPal account. It can take a few days to appear.\n\n"
                        + "With warm regards,\nLICHT Signature Souvenirs");
        return mapper.order(o);
    }

    // ---------- internals ----------

    /** Records a capture outcome on a locked order; confirms and emails only on the first transition to PAID. */
    private void apply(Order o, Capture c, String source) {
        Payment p = paypalPayment(o).orElse(null);
        if (p == null || o.getPaymentStatus() == Order.PaymentStatus.PAID) return;
        if (c.captureId() != null) p.setCaptureReference(c.captureId());

        if (c.completed()) {
            boolean amountOk = c.amount() != null && c.amount().compareTo(o.getTotal()) == 0
                    && payments.currency().equalsIgnoreCase(c.currency());
            if (!amountOk) {
                // Should never happen (we set the amount), but never confirm an order for the wrong sum.
                p.setStatus(Order.PaymentStatus.PENDING);
                o.setExpiresAt(null);
                OrderService.addAdminNote(o, "PayPal captured " + c.amount() + " " + c.currency()
                        + " but the order total is " + o.getTotal() + " " + payments.currency() + ". Review before production.");
                email.notifyAdmin("PayPal amount mismatch on order " + o.getOrderNumber(),
                        "Captured " + c.amount() + " " + c.currency() + ", expected " + o.getTotal() + " " + payments.currency() + ".");
                return;
            }
            boolean wasCancelled = o.getStatus() == Order.Status.CANCELLED;
            p.setStatus(Order.PaymentStatus.PAID);
            o.setPaymentStatus(Order.PaymentStatus.PAID);
            o.setExpiresAt(null);
            if (wasCancelled) {
                // Money arrived for an order already released (e.g. captured from the PayPal dashboard).
                OrderService.addAdminNote(o, "PayPal payment received after the order was cancelled — refund it or recreate the order.");
                email.notifyAdmin("Payment received for cancelled order " + o.getOrderNumber(),
                        "PayPal capture " + c.captureId() + " arrived after the order was cancelled. Refund or recreate it.");
                return;
            }
            o.setStatus(Order.Status.CONFIRMED);
            log.info("Order {} paid via PayPal (capture {}, {})", o.getOrderNumber(), c.captureId(), source);
            orderService.sendConfirmation(o, instructions(o));
        } else if (c.pending()) {
            // PayPal is reviewing the payment (e.g. eCheck); keep the reservation until a webhook settles it.
            p.setStatus(Order.PaymentStatus.PENDING);
            o.setExpiresAt(null);
            OrderService.addAdminNote(o, "PayPal capture " + c.captureId() + " is pending review at PayPal.");
        } else if ("DECLINED".equals(c.captureStatus()) || "DENIED".equals(c.captureStatus()) || "FAILED".equals(c.captureStatus())) {
            p.setStatus(Order.PaymentStatus.FAILED);
            o.setPaymentStatus(Order.PaymentStatus.FAILED);
            OrderService.addAdminNote(o, "PayPal capture " + c.captureId() + " was " + c.captureStatus().toLowerCase() + ".");
        }
    }

    private void markRefunded(Order o, String captureId, String note) {
        o.setPaymentStatus(Order.PaymentStatus.REFUNDED);
        paymentRepo.findFirstByCaptureReference(captureId).ifPresent(p -> p.setStatus(Order.PaymentStatus.REFUNDED));
        OrderService.addAdminNote(o, note);
    }

    private String instructions(Order o) {
        return switch (o.getPaymentStatus()) {
            case PAID -> "Thank you — your PayPal payment has been received. Production begins once your order is confirmed.";
            default -> "PayPal is reviewing your payment. We will email you as soon as it clears.";
        };
    }

    /** Loads and locks the order, checking the PayPal order id the browser sent belongs to it. */
    private Order lockOrder(String orderNumber, String paypalOrderId) {
        Order o = orders.lockByOrderNumber(orderNumber.trim().toUpperCase()).orElseThrow(() -> ApiException.notFound("Order"));
        paypalPayment(o).filter(p -> p.getProviderReference().equals(paypalOrderId))
                .orElseThrow(() -> ApiException.notFound("Order"));
        return o;
    }

    private Optional<Order> findByPayPalOrder(String paypalOrderId) {
        if (paypalOrderId == null) return Optional.empty();
        return paymentRepo.findFirstByProviderAndProviderReference(PaymentService.PAYPAL_PROVIDER, paypalOrderId)
                .flatMap(p -> orders.lockById(p.getOrder().getId()));
    }

    private Optional<Order> findByCapture(String captureId) {
        if (captureId == null) return Optional.empty();
        return paymentRepo.findFirstByCaptureReference(captureId).flatMap(p -> orders.lockById(p.getOrder().getId()));
    }

    private static Optional<Payment> paypalPayment(Order o) {
        return o.getPayments().stream()
                .filter(p -> PaymentService.PAYPAL_PROVIDER.equals(p.getProvider()) && p.getProviderReference() != null)
                .reduce((a, b) -> b);
    }

    /** A refund resource links "up" to the capture it refunds. */
    private static String upLink(JsonNode refund) {
        for (JsonNode l : refund.path("links")) {
            if ("up".equals(l.path("rel").asText())) {
                String href = l.path("href").asText("");
                return href.substring(href.lastIndexOf('/') + 1);
            }
        }
        return null;
    }

    private static BigDecimal decimal(String s) {
        try {
            return s == null ? null : new BigDecimal(s);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /** Request headers PayPal signs webhooks with, lower-cased. */
    public boolean verifyWebhook(Map<String, String> headers, String rawBody) {
        return paypal.verifyWebhook(headers, rawBody);
    }
}
