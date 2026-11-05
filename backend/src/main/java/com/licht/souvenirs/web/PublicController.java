package com.licht.souvenirs.web;

import com.fasterxml.jackson.databind.JsonNode;
import com.licht.souvenirs.domain.Enquiry;
import com.licht.souvenirs.domain.NewsletterSubscriber;
import com.licht.souvenirs.dto.Dtos.*;
import com.licht.souvenirs.repo.Repositories.*;
import com.licht.souvenirs.security.CaptchaService;
import com.licht.souvenirs.security.RateLimiter;
import com.licht.souvenirs.service.ContentService;
import com.licht.souvenirs.service.EmailService;
import com.licht.souvenirs.service.Mapper;
import com.licht.souvenirs.service.StorageService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class PublicController {
    private final ContentService content;
    private final TestimonialRepository testimonials;
    private final FaqRepository faqs;
    private final NewsletterRepository newsletter;
    private final EnquiryRepository enquiries;
    private final StorageService storage;
    private final EmailService email;
    private final RateLimiter limiter;
    private final Mapper mapper;
    private final CaptchaService captcha;

    public PublicController(ContentService content, TestimonialRepository testimonials, FaqRepository faqs,
                            NewsletterRepository newsletter, EnquiryRepository enquiries, StorageService storage,
                            EmailService email, RateLimiter limiter, Mapper mapper, CaptchaService captcha) {
        this.content = content;
        this.testimonials = testimonials;
        this.faqs = faqs;
        this.newsletter = newsletter;
        this.enquiries = enquiries;
        this.storage = storage;
        this.email = email;
        this.limiter = limiter;
        this.mapper = mapper;
        this.captcha = captcha;
    }

    @GetMapping("/content")
    public JsonNode allContent(HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
        return content.all();
    }

    @GetMapping("/content/{key}")
    public JsonNode content(@PathVariable String key, HttpServletResponse res) {
        res.setHeader("Cache-Control", "public, max-age=180, stale-while-revalidate=600");
        return content.get(key);
    }

    @GetMapping("/testimonials")
    @Transactional(readOnly = true)
    public List<TestimonialDto> testimonials() {
        return testimonials.findByActiveTrueOrderBySortOrderAscIdAsc().stream().map(mapper::testimonial).toList();
    }

    @GetMapping("/faqs")
    @Transactional(readOnly = true)
    public List<FaqDto> faqs() {
        return faqs.findByActiveTrueOrderBySortOrderAscIdAsc().stream().map(mapper::faq).toList();
    }

    @PostMapping("/newsletter")
    @Transactional
    public Map<String, String> subscribe(@Valid @RequestBody NewsletterRequest r, HttpServletRequest req) {
        limiter.check(req, "newsletter", 10, 3600);
        String e = r.email().trim().toLowerCase();
        newsletter.findByEmailIgnoreCase(e).ifPresentOrElse(s -> s.setActive(true),
                () -> newsletter.save(new NewsletterSubscriber(e)));
        return Map.of("message", "Thank you — you're on the list.");
    }

    @PostMapping("/enquiries")
    @Transactional
    public Map<String, Object> enquire(@Valid @RequestBody EnquiryRequest r, HttpServletRequest req) {
        limiter.check(req, "enquiry", 8, 3600);
        if (r.website() != null && !r.website().isBlank()) {
            // Honeypot tripped: pretend success so bots learn nothing.
            return Map.of("message", "Thank you. Our team will be in touch shortly.");
        }
        captcha.verify(r.captchaToken(), req);
        Enquiry.Type type = Enquiry.Type.valueOf(r.type());
        if (type == Enquiry.Type.CORPORATE && (r.companyName() == null || r.companyName().isBlank())) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "Please tell us your company name.");
        }
        if ((type == Enquiry.Type.BULK || type == Enquiry.Type.CORPORATE) && r.quantity() == null) {
            throw ApiException.badRequest("Please tell us roughly how many pieces you need.");
        }
        Enquiry e = new Enquiry();
        e.setType(type);
        e.setFullName(r.fullName().trim());
        e.setEmail(r.email().trim().toLowerCase());
        e.setPhone(r.phone());
        e.setCompanyName(r.companyName());
        e.setEnquiryTopic(r.enquiryTopic());
        e.setEventType(r.eventType());
        e.setEventDate(r.eventDate());
        e.setProductRequirements(r.productRequirements());
        e.setQuantity(r.quantity());
        e.setBudgetRange(r.budgetRange());
        e.setPersonalisationRequirements(r.personalisationRequirements());
        e.setMessage(r.message());
        enquiries.save(e);

        email.send(e.getEmail(), "We've received your enquiry — LICHT Signature",
                "Dear " + e.getFullName() + ",\n\nThank you for reaching out. Our team will review your request "
                        + "and reply within two working days.\n\nReference: ENQ-" + e.getId()
                        + "\n\nWith warm regards,\nLICHT Signature Souvenirs");
        email.notifyAdmin("New " + type.name().toLowerCase() + " enquiry from " + e.getFullName(),
                "Email: " + e.getEmail() + "\nQuantity: " + e.getQuantity() + "\nEvent: " + e.getEventType()
                        + " on " + e.getEventDate() + "\n\n" + (e.getMessage() == null ? "" : e.getMessage()));
        return Map.of("id", e.getId(), "message", "Thank you. Our team will be in touch within two working days.");
    }

    /**
     * Customer logo upload for personalised products. Logos that never end up in a bag or order are
     * deleted after app.storage.orphan-logo-hours (see MaintenanceJobs), so disk use stays bounded.
     */
    @PostMapping(value = "/uploads/logo", consumes = "multipart/form-data")
    public UploadResponse uploadLogo(@RequestParam("file") MultipartFile file, HttpServletRequest req) {
        limiter.check(req, "logo", 10, 3600);
        return new UploadResponse(storage.storeImage(file, "logos"));
    }
}
