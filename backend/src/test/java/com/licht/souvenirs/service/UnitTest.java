package com.licht.souvenirs.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class UnitTest {
    @Test
    void emailSubjectsCannotCarryExtraHeaders() {
        assertThat(EmailService.headerSafe("New enquiry from Eve\r\nBcc: victim@example.com"))
                .isEqualTo("New enquiry from Eve Bcc: victim@example.com")
                .doesNotContain("\n").doesNotContain("\r");
    }

    @Test
    void storageOnlyRecognisesItsOwnFiles() throws Exception {
        StorageService s = new StorageService("target/unit-uploads", "/uploads");
        assertThat(s.isStoredUrl("/uploads/logos/0f8fad5b-d9cb-469f-a165-70867728950e.webp", "logos")).isTrue();
        assertThat(s.isStoredUrl("/uploads/logos/../products/0f8fad5b-d9cb-469f-a165-70867728950e.png", "logos")).isFalse();
        assertThat(s.isStoredUrl("https://evil.example/uploads/logos/x.png", "logos")).isFalse();
        assertThat(s.isStoredUrl("/uploads/logos/payload.html", "logos")).isFalse();
    }

    @Test
    void payPalAmountsUseTheCurrencyPrecision() {
        assertThat(PayPalClient.format(new BigDecimal("12.5"), "GBP")).isEqualTo("12.50");
        assertThat(PayPalClient.format(new BigDecimal("1500.00"), "JPY")).isEqualTo("1500");
    }
}
