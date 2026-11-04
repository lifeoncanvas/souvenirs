package com.licht.souvenirs.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.Currency;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

/**
 * Thin client for the PayPal REST API (Orders v2, captures, refunds, webhook verification).
 * Inactive until PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are set; the client secret never leaves the server.
 */
@Service
public class PayPalClient {
    private static final Logger log = LoggerFactory.getLogger(PayPalClient.class);

    private final String clientId;
    private final String clientSecret;
    private final String webhookId;
    private final String brandName;
    private final boolean live;
    private final ObjectMapper json;
    private final RestClient http;

    private String accessToken;
    private Instant accessTokenExpiresAt = Instant.EPOCH;

    /** A PayPal API error, carrying PayPal's issue code (e.g. INSTRUMENT_DECLINED) when it gave one. */
    public static class PayPalException extends RuntimeException {
        private final String issue;
        private final int status;

        public PayPalException(String message, String issue, int status) {
            super(message);
            this.issue = issue;
            this.status = status;
        }

        public String getIssue() { return issue; }
        public int getStatus() { return status; }
    }

    /** The result of capturing (or looking up) an order: status plus the capture that moved the money. */
    public record Capture(String orderStatus, String captureId, String captureStatus, BigDecimal amount,
                          String currency, String customId) {
        public boolean completed() { return "COMPLETED".equals(captureStatus); }
        public boolean pending() { return "PENDING".equals(captureStatus); }
    }

    public PayPalClient(@Value("${app.payment.paypal.client-id:}") String clientId,
                        @Value("${app.payment.paypal.client-secret:}") String clientSecret,
                        @Value("${app.payment.paypal.mode:sandbox}") String mode,
                        @Value("${app.payment.paypal.webhook-id:}") String webhookId,
                        @Value("${app.payment.paypal.brand-name:}") String brandName,
                        ObjectMapper json, RestClient.Builder builder) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.clientSecret = clientSecret == null ? "" : clientSecret.trim();
        this.webhookId = webhookId == null ? "" : webhookId.trim();
        this.brandName = brandName;
        this.live = "live".equalsIgnoreCase(mode == null ? "" : mode.trim());
        this.json = json;
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofSeconds(10));
        rf.setReadTimeout(Duration.ofSeconds(30));
        this.http = builder.requestFactory(rf)
                .baseUrl(live ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com").build();
        if (enabled()) log.info("PayPal payments enabled ({} mode).", live ? "live" : "sandbox");
        else log.info("PayPal payments disabled (PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET not set).");
    }

    public boolean enabled() {
        return !clientId.isEmpty() && !clientSecret.isEmpty();
    }

    public boolean webhooksEnabled() {
        return enabled() && !webhookId.isEmpty();
    }

    /** The public client id the browser SDK loads with. */
    public String clientId() {
        return clientId;
    }

    /** Creates a PayPal order for the full amount; returns PayPal's order id. */
    public String createOrder(String orderNumber, BigDecimal total, String currency, String description) {
        ObjectNode body = json.createObjectNode();
        body.put("intent", "CAPTURE");
        ObjectNode unit = body.putArray("purchase_units").addObject();
        unit.put("reference_id", orderNumber);
        unit.put("custom_id", orderNumber);
        unit.put("invoice_id", orderNumber);
        unit.put("description", truncate(description, 127));
        ObjectNode amount = unit.putObject("amount");
        amount.put("currency_code", currency);
        amount.put("value", format(total, currency));
        ObjectNode ctx = body.putObject("payment_source").putObject("paypal").putObject("experience_context");
        if (brandName != null && !brandName.isBlank()) ctx.put("brand_name", truncate(brandName, 127));
        ctx.put("shipping_preference", "NO_SHIPPING");
        ctx.put("user_action", "PAY_NOW");

        JsonNode res = call("POST", "/v2/checkout/orders", body, "create-" + orderNumber);
        String id = res.path("id").asText(null);
        if (id == null) throw new PayPalException("PayPal did not return an order id", null, 502);
        return id;
    }

    /**
     * Captures an approved order. No request id is sent, so a retry after a declined card really retries;
     * a second capture of a paid order is refused by PayPal (ORDER_ALREADY_CAPTURED) and resolved by lookup.
     */
    public Capture capture(String paypalOrderId) {
        try {
            return parseCapture(call("POST", "/v2/checkout/orders/" + safeId(paypalOrderId) + "/capture",
                    json.createObjectNode(), null));
        } catch (PayPalException e) {
            if ("ORDER_ALREADY_CAPTURED".equals(e.getIssue())) return getOrder(paypalOrderId);
            throw e;
        }
    }

    public Capture getOrder(String paypalOrderId) {
        return parseCapture(call("GET", "/v2/checkout/orders/" + safeId(paypalOrderId), null, null));
    }

    /** Refunds a capture in full; returns PayPal's refund status (COMPLETED or PENDING). */
    public String refund(String captureId, String requestId) {
        JsonNode res = call("POST", "/v2/payments/captures/" + safeId(captureId) + "/refund",
                json.createObjectNode(), requestId);
        return res.path("status").asText("");
    }

    /**
     * Asks PayPal whether a webhook delivery is genuine. The event is passed back byte-for-byte as
     * received, which PayPal's signature check requires.
     */
    public boolean verifyWebhook(Map<String, String> headers, String rawBody) {
        if (!webhooksEnabled()) return false;
        String[] names = {"paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id",
                "paypal-transmission-sig", "paypal-transmission-time"};
        String[] fields = {"auth_algo", "cert_url", "transmission_id", "transmission_sig", "transmission_time"};
        StringBuilder body = new StringBuilder("{");
        try {
            for (int i = 0; i < names.length; i++) {
                String v = headers.get(names[i]);
                if (v == null || v.isBlank()) return false;
                body.append(json.writeValueAsString(fields[i])).append(':').append(json.writeValueAsString(v)).append(',');
            }
            json.readTree(rawBody); // must at least be JSON before it is spliced in
            body.append("\"webhook_id\":").append(json.writeValueAsString(webhookId))
                    .append(",\"webhook_event\":").append(rawBody).append('}');
            JsonNode res = call("POST", "/v1/notifications/verify-webhook-signature", body.toString(), null);
            return "SUCCESS".equals(res.path("verification_status").asText());
        } catch (Exception e) {
            log.warn("PayPal webhook verification failed: {}", e.getMessage());
            return false;
        }
    }

    // ---------- internals ----------

    private Capture parseCapture(JsonNode order) {
        JsonNode unit = order.path("purchase_units").path(0);
        JsonNode cap = unit.path("payments").path("captures").path(0);
        BigDecimal amount = cap.path("amount").hasNonNull("value") ? new BigDecimal(cap.path("amount").path("value").asText()) : null;
        String customId = cap.path("custom_id").asText(unit.path("custom_id").asText(null));
        return new Capture(order.path("status").asText(null), cap.path("id").asText(null),
                cap.path("status").asText(null), amount, cap.path("amount").path("currency_code").asText(null), customId);
    }

    private JsonNode call(String method, String path, Object body, String requestId) {
        try {
            RestClient.RequestBodySpec req = http.method(org.springframework.http.HttpMethod.valueOf(method)).uri(path)
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + token())
                    .header("Prefer", "return=representation")
                    .contentType(MediaType.APPLICATION_JSON);
            if (requestId != null) req = req.header("PayPal-Request-Id", truncate(requestId, 108));
            if (body != null) req = req.body(body instanceof String s ? s : json.writeValueAsString(body));
            String res = req.retrieve().body(String.class);
            return res == null || res.isBlank() ? json.createObjectNode() : json.readTree(res);
        } catch (RestClientResponseException e) {
            throw toException(e);
        } catch (PayPalException e) {
            throw e;
        } catch (Exception e) {
            throw new PayPalException("PayPal could not be reached: " + e.getMessage(), null, 503);
        }
    }

    private synchronized String token() {
        if (accessToken != null && Instant.now().isBefore(accessTokenExpiresAt)) return accessToken;
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("grant_type", "client_credentials");
        try {
            JsonNode res = http.post().uri("/v1/oauth2/token")
                    .headers(h -> h.setBasicAuth(clientId, clientSecret))
                    .contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(JsonNode.class);
            if (res == null || !res.hasNonNull("access_token")) throw new PayPalException("PayPal returned no access token", null, 502);
            accessToken = res.get("access_token").asText();
            accessTokenExpiresAt = Instant.now().plusSeconds(Math.max(60, res.path("expires_in").asLong(300) - 60));
            return accessToken;
        } catch (RestClientResponseException e) {
            throw toException(e);
        } catch (RestClientException e) {
            throw new PayPalException("PayPal could not be reached: " + e.getMessage(), null, 503);
        }
    }

    private PayPalException toException(RestClientResponseException e) {
        String issue = null;
        String message = e.getStatusText();
        try {
            JsonNode err = json.readTree(e.getResponseBodyAsString());
            issue = err.path("details").path(0).path("issue").asText(null);
            if (issue == null) issue = err.path("name").asText(null);
            message = err.path("message").asText(message);
        } catch (Exception ignored) {
            // Non-JSON error body; keep the status text.
        }
        log.warn("PayPal API error {} {}: {}", e.getStatusCode().value(), issue, message);
        return new PayPalException(message, issue, e.getStatusCode().value());
    }

    /** PayPal amounts use the currency's minor-unit precision (2 for GBP/EUR/USD, 0 for JPY). */
    static String format(BigDecimal amount, String currency) {
        int digits = Math.max(0, Currency.getInstance(currency).getDefaultFractionDigits());
        return amount.setScale(digits, RoundingMode.HALF_UP).toPlainString();
    }

    /** Ids come from the browser; PayPal ids are alphanumeric, so anything else is refused before it reaches a URL. */
    private static String safeId(String id) {
        if (id == null || !id.matches("^[A-Za-z0-9-]{1,64}$")) throw new PayPalException("Invalid PayPal id", "INVALID_ID", 400);
        return id;
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }
}
