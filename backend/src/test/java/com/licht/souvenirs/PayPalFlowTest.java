package com.licht.souvenirs;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.licht.souvenirs.domain.Order;
import com.licht.souvenirs.repo.Repositories.OrderRepository;
import com.licht.souvenirs.service.PayPalClient.Capture;
import com.licht.souvenirs.service.PayPalClient.PayPalException;
import java.math.BigDecimal;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

class PayPalFlowTest extends ApiTestSupport {
    @Autowired OrderRepository orders;

    @BeforeEach
    void enablePayPal() {
        when(paypal.enabled()).thenReturn(true);
        when(paypal.clientId()).thenReturn("test-client-id");
        when(paypal.createOrder(anyString(), any(), eq("GBP"), anyString())).thenAnswer(inv -> "PP-" + inv.getArgument(0));
    }

    /** Checks out a one-item PayPal bag; returns [orderNumber, paypalOrderId, total, bagToken]. */
    private String[] paypalCheckout(com.licht.souvenirs.domain.Product p) throws Exception {
        String bag = addToCart(p, 1, null, null);
        Res co = checkout(bag, null, "PAYPAL");
        assertThat(co.status()).isEqualTo(200);
        return new String[] {co.body().path("order").path("orderNumber").asText(), co.body().get("paypalOrderId").asText(),
                co.body().path("order").path("total").asText(), bag};
    }

    private Capture completed(String amount) {
        return new Capture("COMPLETED", "CAPTURE-1", "COMPLETED", new BigDecimal(amount), "GBP", null);
    }

    @Test
    void configExposesOnlyPublicValues() throws Exception {
        Res r = get("/api/payments/config", null);
        assertThat(r.body().get("paypalEnabled").asBoolean()).isTrue();
        assertThat(r.body().get("paypalClientId").asText()).isEqualTo("test-client-id");
        assertThat(r.body().toString()).doesNotContain("secret");
    }

    @Test
    void approvedPaymentIsCapturedConfirmedAndEmptiesTheBag() throws Exception {
        var p = product("50.00", 2);
        String[] c = paypalCheckout(p);
        String number = c[0], pp = c[1], bag = c[3];
        assertThat(pp).isEqualTo("PP-" + number);
        BigDecimal total = new BigDecimal(c[2]);
        // Not yet paid: the bag is kept so a cancelled PayPal window loses nothing.
        assertThat(call(HttpMethod.GET, "/api/cart", null, null, bag).body().get("items")).hasSize(1);

        when(paypal.capture(pp)).thenReturn(completed(total.toPlainString()));
        Res cap = call(HttpMethod.POST, "/api/payments/paypal/capture",
                Map.of("orderNumber", number, "paypalOrderId", pp), null, bag);
        assertThat(cap.status()).isEqualTo(200);
        assertThat(cap.body().path("order").path("paymentStatus").asText()).isEqualTo("PAID");
        assertThat(cap.body().path("order").path("status").asText()).isEqualTo("CONFIRMED");
        assertThat(call(HttpMethod.GET, "/api/cart", null, null, bag).body().get("items")).isEmpty();

        // A repeat (double click, retry) is harmless and does not capture twice.
        Res again = call(HttpMethod.POST, "/api/payments/paypal/capture",
                Map.of("orderNumber", number, "paypalOrderId", pp), null, bag);
        assertThat(again.status()).isEqualTo(200);
        verify(paypal, org.mockito.Mockito.times(1)).capture(pp);
    }

    @Test
    void captureNeedsTheMatchingPayPalOrderId() throws Exception {
        var p = product("50.00", 2);
        String[] c = paypalCheckout(p);
        String number = c[0], pp = c[1];
        Res r = post("/api/payments/paypal/capture", Map.of("orderNumber", number, "paypalOrderId", "SOMEONE-ELSES"), null);
        assertThat(r.status()).isEqualTo(404);
        verify(paypal, never()).capture(anyString());
    }

    @Test
    void wrongCapturedAmountIsNeverConfirmed() throws Exception {
        var p = product("50.00", 2);
        String[] c = paypalCheckout(p);
        String number = c[0], pp = c[1];
        when(paypal.capture(pp)).thenReturn(completed("0.01"));
        post("/api/payments/paypal/capture", Map.of("orderNumber", number, "paypalOrderId", pp), null);
        Order o = orders.findByOrderNumber(number).orElseThrow();
        assertThat(o.getPaymentStatus()).isNotEqualTo(Order.PaymentStatus.PAID);
        assertThat(o.getStatus()).isEqualTo(Order.Status.PENDING);
        assertThat(o.getAdminNotes()).contains("Review before production");
    }

    @Test
    void declinedCardAsksTheBuyerToChooseAnotherMethod() throws Exception {
        var p = product("50.00", 2);
        String[] c = paypalCheckout(p);
        String number = c[0], pp = c[1];
        when(paypal.capture(pp)).thenThrow(new PayPalException("declined", "INSTRUMENT_DECLINED", 422));
        Res r = post("/api/payments/paypal/capture", Map.of("orderNumber", number, "paypalOrderId", pp), null);
        assertThat(r.status()).isEqualTo(402);
        assertThat(r.body().get("code").asText()).isEqualTo("INSTRUMENT_DECLINED");
        assertThat(orders.findByOrderNumber(number).orElseThrow().getStatus()).isEqualTo(Order.Status.PENDING);
    }

    @Test
    void cancellingReleasesStockAndAnExpiredCheckoutIsNotCaptured() throws Exception {
        var p = product("50.00", 1);
        String[] c = paypalCheckout(p);
        String number = c[0], pp = c[1];
        assertThat(stockOf(p)).isZero();
        when(paypal.getOrder(pp)).thenReturn(new Capture("APPROVED", null, null, null, null, null));

        assertThat(post("/api/payments/paypal/cancel", Map.of("orderNumber", number, "paypalOrderId", pp), null).status())
                .isEqualTo(200);
        assertThat(stockOf(p)).isEqualTo(1);

        Res late = post("/api/payments/paypal/capture", Map.of("orderNumber", number, "paypalOrderId", pp), null);
        assertThat(late.status()).isEqualTo(409);
        verify(paypal, never()).capture(anyString());
    }

    @Test
    void webhooksWithoutAValidSignatureAreRejected() throws Exception {
        when(paypal.webhooksEnabled()).thenReturn(true);
        when(paypal.verifyWebhook(any(), anyString())).thenReturn(false);
        var res = mvc.perform(MockMvcRequestBuilders.post("/api/payments/paypal/webhook")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"event_type\":\"PAYMENT.CAPTURE.COMPLETED\",\"resource\":{}}")).andReturn().getResponse();
        assertThat(res.getStatus()).isEqualTo(400);
    }

    @Test
    void verifiedCaptureWebhookConfirmsAnOrderWhoseBrowserNeverReturned() throws Exception {
        var p = product("50.00", 2);
        String[] c = paypalCheckout(p);
        String number = c[0], pp = c[1], total = c[2];
        when(paypal.webhooksEnabled()).thenReturn(true);
        when(paypal.verifyWebhook(any(), anyString())).thenReturn(true);
        String event = """
                {"event_type":"PAYMENT.CAPTURE.COMPLETED","resource":{"id":"CAPTURE-9","status":"COMPLETED",
                 "amount":{"currency_code":"GBP","value":"%s"},
                 "supplementary_data":{"related_ids":{"order_id":"%s"}}}}""".formatted(total, pp);
        var res = mvc.perform(MockMvcRequestBuilders.post("/api/payments/paypal/webhook")
                .contentType(MediaType.APPLICATION_JSON).content(event)).andReturn().getResponse();
        assertThat(res.getStatus()).isEqualTo(200);
        Order o = orders.findByOrderNumber(number).orElseThrow();
        assertThat(o.getPaymentStatus()).isEqualTo(Order.PaymentStatus.PAID);
        assertThat(o.getStatus()).isEqualTo(Order.Status.CONFIRMED);
    }

    @Test
    void payPalIsRefusedWhenNotConfigured() throws Exception {
        when(paypal.enabled()).thenReturn(false);
        var p = product("50.00", 2);
        Res r = checkout(addToCart(p, 1, null, null), null, "PAYPAL");
        assertThat(r.status()).isEqualTo(400);
        assertThat(stockOf(p)).isEqualTo(2);
    }
}
