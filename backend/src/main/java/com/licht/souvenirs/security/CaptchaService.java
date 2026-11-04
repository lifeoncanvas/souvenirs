package com.licht.souvenirs.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.licht.souvenirs.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.web.client.RestClient;

/**
 * Cloudflare Turnstile check for public forms that send email or reserve stock.
 * Disabled (every request passes) until TURNSTILE_SECRET_KEY is set.
 */
@Service
public class CaptchaService {
    private static final Logger log = LoggerFactory.getLogger(CaptchaService.class);
    private static final String VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

    private final String secret;
    private final RestClient http;

    public CaptchaService(@Value("${app.captcha.turnstile-secret:}") String secret, RestClient.Builder builder) {
        this.secret = secret == null ? "" : secret.trim();
        SimpleClientHttpRequestFactory rf = new SimpleClientHttpRequestFactory();
        rf.setConnectTimeout(Duration.ofSeconds(5));
        rf.setReadTimeout(Duration.ofSeconds(10));
        this.http = builder.requestFactory(rf).build();
        if (!enabled()) log.info("Turnstile CAPTCHA is disabled (TURNSTILE_SECRET_KEY not set).");
    }

    public boolean enabled() {
        return !secret.isEmpty();
    }

    public void verify(String token, HttpServletRequest req) {
        if (!enabled()) return;
        if (token == null || token.isBlank() || token.length() > 2048) {
            throw ApiException.badRequest("Please complete the security check.");
        }
        LinkedMultiValueMap<String, String> form = new LinkedMultiValueMap<>();
        form.add("secret", secret);
        form.add("response", token);
        form.add("remoteip", req.getRemoteAddr());
        JsonNode res;
        try {
            res = http.post().uri(VERIFY_URL).contentType(MediaType.APPLICATION_FORM_URLENCODED)
                    .body(form).retrieve().body(JsonNode.class);
        } catch (Exception e) {
            log.warn("Turnstile verification failed: {}", e.getMessage());
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "The security check is unavailable. Please try again shortly.");
        }
        if (res == null || !res.path("success").asBoolean(false)) {
            throw ApiException.badRequest("The security check failed. Please try again.");
        }
    }
}
