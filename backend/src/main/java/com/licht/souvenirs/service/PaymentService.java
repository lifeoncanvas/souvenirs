package com.licht.souvenirs.service;

import com.licht.souvenirs.domain.Order;
import com.licht.souvenirs.domain.Payment;
import com.licht.souvenirs.web.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Payment entry point. Manual methods (bank transfer, payment after proof approval) record a pending
 * payment and return instructions. PayPal creates a PayPal order the buyer approves in the browser;
 * the server then captures it (see PayPalCheckoutService). No card data ever reaches this server.
 */
@Service
public class PaymentService {
    public static final String PAYPAL = "PAYPAL";
    public static final String MANUAL_PROVIDER = "manual";
    public static final String PAYPAL_PROVIDER = "paypal";

    private final PayPalClient paypal;
    private final String currency;

    public PaymentService(PayPalClient paypal, @Value("${app.currency:GBP}") String currency) {
        this.paypal = paypal;
        this.currency = currency.trim().toUpperCase();
    }

    /** {@code paypalOrderId} is set only for PayPal: the id the browser SDK approves. */
    public record Initiation(Payment payment, String instructions, String paypalOrderId) {}

    public String currency() {
        return currency;
    }

    public boolean paypalEnabled() {
        return paypal.enabled();
    }

    public Initiation initiate(Order order, String method) {
        Payment p = new Payment();
        p.setOrder(order);
        p.setMethod(method);
        p.setAmount(order.getTotal());
        p.setStatus(Order.PaymentStatus.PENDING);
        order.getPayments().add(p);
        order.setPaymentStatus(Order.PaymentStatus.PENDING);

        if (PAYPAL.equals(method)) {
            if (paypal.enabled()) {
                String id;
                try {
                    id = paypal.createOrder(order.getOrderNumber(), order.getTotal(), currency,
                            "LICHT Signature order " + order.getOrderNumber());
                } catch (PayPalClient.PayPalException e) {
                    throw new ApiException(HttpStatus.BAD_GATEWAY, "PayPal is unavailable at the moment. Please try again or choose another payment method.");
                }
                p.setProvider(PAYPAL_PROVIDER);
                p.setProviderReference(id);
                return new Initiation(p, "Your PayPal payment has been received. Production begins once your order is confirmed.", id);
            }
            // Fallback when PayPal live credentials are not set up
            p.setProvider(PAYPAL_PROVIDER);
            p.setProviderReference(order.getOrderNumber());
            return new Initiation(p, "Thank you for choosing PayPal. A PayPal payment request / invoice has been linked with your order "
                    + order.getOrderNumber() + ". Production begins once payment is completed.", null);
        }

        p.setProvider(MANUAL_PROVIDER);
        p.setProviderReference(order.getOrderNumber());
        String instructions = switch (method) {
            case "BANK_TRANSFER" -> "Please transfer the order total using your order number "
                    + order.getOrderNumber() + " as the payment reference. Our bank details are included "
                    + "in your confirmation email. Production begins once payment is received.";
            default -> "Our studio will review your personalisation details and email a proof together with "
                    + "a secure payment link. Production begins once you approve and pay.";
        };
        return new Initiation(p, instructions, null);
    }
}
