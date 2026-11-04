package com.licht.souvenirs.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.licht.souvenirs.domain.*;
import com.licht.souvenirs.repo.Repositories.*;
import com.licht.souvenirs.service.ContentService;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seeds roles, an administrator, and placeholder catalogue/content on an empty database.
 * Everything seeded here is placeholder material, editable from the admin dashboard:
 * product names, prices, images (Unsplash), contact details and testimonials must be replaced
 * with the business's real information before launch.
 */
@Component
public class DataSeeder implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final RoleRepository roles;
    private final UserRepository users;
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final TestimonialRepository testimonials;
    private final FaqRepository faqs;
    private final CouponRepository coupons;
    private final ContentService content;
    private final PasswordEncoder encoder;
    private final ObjectMapper json;
    private final boolean enabled;
    private final String adminEmail;
    private final String adminPassword;

    public DataSeeder(RoleRepository roles, UserRepository users, CategoryRepository categories,
                      ProductRepository products, TestimonialRepository testimonials, FaqRepository faqs,
                      CouponRepository coupons, ContentService content, PasswordEncoder encoder, ObjectMapper json,
                      @Value("${app.seed.enabled}") boolean enabled,
                      @Value("${app.seed.admin-email}") String adminEmail,
                      @Value("${app.seed.admin-password:}") String adminPassword) {
        this.roles = roles;
        this.users = users;
        this.categories = categories;
        this.products = products;
        this.testimonials = testimonials;
        this.faqs = faqs;
        this.coupons = coupons;
        this.content = content;
        this.encoder = encoder;
        this.json = json;
        this.enabled = enabled;
        this.adminEmail = adminEmail;
        this.adminPassword = adminPassword;
    }

    static String img(String id, int w) {
        return "https://images.unsplash.com/photo-" + id + "?w=" + w + "&q=80&auto=format&fit=crop";
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) throws Exception {
        Role customer = roles.findByName(Role.CUSTOMER).orElseGet(() -> roles.save(new Role(Role.CUSTOMER)));
        Role admin = roles.findByName(Role.ADMIN).orElseGet(() -> roles.save(new Role(Role.ADMIN)));
        seedAdmin(customer, admin);
        if (!enabled) return;
        if (categories.count() == 0) seedCatalogue();
        if (testimonials.count() == 0) seedTestimonials();
        if (faqs.count() == 0) seedFaqs();
        if (coupons.count() == 0) seedCoupons();
        seedContent();
    }

    private void seedAdmin(Role customer, Role admin) {
        if (users.findAll().stream().anyMatch(User::isAdmin)) return;
        String password = adminPassword;
        boolean generated = password == null || password.isBlank();
        if (generated) {
            byte[] b = new byte[12];
            new SecureRandom().nextBytes(b);
            password = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(b);
        }
        User u = new User();
        u.setEmail(adminEmail.toLowerCase());
        u.setFirstName("Studio");
        u.setLastName("Admin");
        u.setPasswordHash(encoder.encode(password));
        u.setEmailVerified(true);
        u.getRoles().add(customer);
        u.getRoles().add(admin);
        users.save(u);
        if (generated) {
            log.warn("\n\n  Created administrator {} with a generated password: {}\n"
                    + "  Set ADMIN_PASSWORD to choose your own, and change it after first sign-in.\n", adminEmail, password);
        } else {
            log.info("Created administrator {}", adminEmail);
        }
    }

    private void seedCatalogue() {
        Map<String, Category> c = new HashMap<>();
        Object[][] cats = {
                {"Wedding Souvenirs", "wedding-souvenirs", "Keepsakes for your guests, crafted to echo the day.", "1511285560929-80b456fea0bc", 1},
                {"Birthday Gifts", "birthday-gifts", "Thoughtful pieces to mark another beautiful year.", "1512909006721-3d6018887383", 2},
                {"Corporate Gifts", "corporate-gifts", "Refined gifting for clients, teams and partners.", "1600857062241-98e5dba7f214", 3},
                {"Personalised Gifts", "personalised-gifts", "Names, dates and messages, finished by hand.", "1531346878377-a5be20888e57", 4},
                {"Gift Boxes", "gift-boxes", "Curated collections, presented beautifully.", "1549465220-1a8b9238cd48", 5},
        };
        for (Object[] row : cats) {
            Category cat = new Category();
            cat.setName((String) row[0]);
            cat.setSlug((String) row[1]);
            cat.setDescription((String) row[2]);
            cat.setImageUrl(img((String) row[3], 900));
            cat.setSortOrder((Integer) row[4]);
            cat.setFeatured(true);
            c.put(cat.getSlug(), categories.save(cat));
        }

        product("The Signature Keepsake Box", "A curated keepsake box wrapped in hand-tied ribbon.",
                "Our signature presentation: a rigid keepsake box lined in ivory, holding a selection of small treasures and a handwritten card. Designed to be kept long after the gift is opened.",
                "Dimensions: 24 × 18 × 9 cm\nMaterials: Rigid board, cotton ribbon\nIncludes: Handwritten card\nLead time: 3–5 working days",
                "68.00", 40, true, true, false, 64, List.of("1608755728617-aefab37d2edd", "1513201099705-a9746e1e201f"),
                List.of(c.get("gift-boxes"), c.get("personalised-gifts")), pz(true, false, false, true, false, false, "0.00"));
        product("Monogrammed Ring Dish", "Porcelain ring dish, hand-finished with your initials.",
                "A small porcelain dish for rings and treasured pieces, finished with a monogram or wedding date in soft gold.",
                "Diameter: 10 cm\nMaterial: Porcelain, gold lustre\nCare: Hand wash only\nLead time: 7–10 working days",
                "34.00", 120, true, true, false, 88, List.of("1606800052052-a08af7148866", "1515934751635-c81c6bc9a2d8"),
                List.of(c.get("wedding-souvenirs"), c.get("personalised-gifts")), pz(false, true, true, false, false, false, "4.00"));
        product("Personalised Soy Candle", "Hand-poured candle with a custom label for your celebration.",
                "A clean-burning soy candle in an amber glass vessel. Your names, date and a short message are printed on a textured label.",
                "Burn time: approx. 40 hours\nWax: Natural soy\nVessel: Amber glass, 200 ml\nMinimum order: 1",
                "26.00", 300, true, true, true, 140, List.of("1602874801007-bd458bb1b8b6", "1603006905003-be475563bc59"),
                List.of(c.get("wedding-souvenirs"), c.get("birthday-gifts"), c.get("personalised-gifts")),
                pz(true, false, true, true, false, true, "0.00"));
        product("Hand-Thrown Keepsake Cups", "A pair of stoneware cups, glazed in warm ivory.",
                "Thrown on the wheel by local ceramicists, each pair is subtly unique. Optional engraved initials on the base.",
                "Set: 2 cups\nCapacity: 220 ml each\nMaterial: Stoneware\nCare: Dishwasher safe",
                "48.00", 60, true, false, true, 41, List.of("1610701596007-11502861dcfa", "1565193566173-7a0ee3dbe261"),
                List.of(c.get("birthday-gifts"), c.get("gift-boxes")), pz(false, true, false, false, false, false, "6.00"));
        product("Initial Pendant Necklace", "Fine chain with an engraved initial pendant.",
                "A delicate pendant engraved with an initial of your choice, presented in a linen pouch inside our signature box.",
                "Chain length: 45 cm\nFinish: Gold-plated sterling silver\nPendant: 12 mm\nPresentation: Linen pouch, gift box",
                "72.00", 35, true, true, false, 57, List.of("1599643478518-a784e5dc4c8f", "1515562141207-7a88fb7ce338"),
                List.of(c.get("birthday-gifts"), c.get("personalised-gifts")), pz(false, true, false, false, false, false, "0.00"));
        product("Engraved Celebration Bracelet", "A slender bracelet engraved with a date that matters.",
                "Engraved on the inner band with a date, coordinates or a few words — a quiet reminder worn every day.",
                "Width: 4 mm\nFinish: Gold-plated brass\nSizing: Adjustable\nEngraving: Up to 30 characters",
                "58.00", 50, false, false, true, 22, List.of("1611591437281-460bfbe1220a", "1605100804763-247f67b3557e"),
                List.of(c.get("personalised-gifts"), c.get("wedding-souvenirs")), pz(false, false, true, true, false, false, "0.00"));
        product("Leather Travel Pouch", "Full-grain leather pouch, embossed with initials or a logo.",
                "A structured leather pouch for travel essentials. Blind-embossed with initials or a company logo — ideal for client gifting.",
                "Dimensions: 22 × 14 cm\nMaterial: Full-grain leather\nLining: Cotton twill\nCorporate minimum: 20 units for logo embossing",
                "64.00", 80, true, true, false, 73, List.of("1600857062241-98e5dba7f214", "1544816155-12df9643f363"),
                List.of(c.get("corporate-gifts"), c.get("personalised-gifts")), pz(false, true, false, false, true, true, "0.00"));
        product("Linen Notebook & Pen Set", "A cloth-bound notebook and weighted pen, presented together.",
                "Lay-flat notebook bound in natural linen with a matching pen. Foil-stamped with a name or company logo.",
                "Notebook: A5, 192 pages\nPaper: 100 gsm ivory\nPen: Weighted metal, black ink\nFoil: Gold or blind",
                "39.00", 200, false, true, true, 96, List.of("1531346878377-a5be20888e57", "1517842645767-c639042777db"),
                List.of(c.get("corporate-gifts"), c.get("personalised-gifts")), pz(true, true, false, false, true, false, "0.00"));
        product("Canvas Event Tote", "Natural canvas tote printed with your event details.",
                "A sturdy cotton canvas tote — a practical favour for weddings, conferences and celebrations, printed with your event name and date.",
                "Dimensions: 38 × 42 cm\nMaterial: 340 gsm cotton canvas\nPrint: One colour\nBulk pricing available from 50 units",
                "18.00", 500, false, false, true, 33, List.of("1544816155-12df9643f363"),
                List.of(c.get("wedding-souvenirs"), c.get("corporate-gifts")), pz(true, false, true, false, true, true, "0.00"));
        product("Artisan Chocolate Favour Box", "Six hand-finished chocolates in a keepsake box.",
                "Six seasonal chocolates from a small chocolatier, packed in a slim box with a personalised belly band.",
                "Pieces: 6\nShelf life: 6 weeks\nAllergens: Contains milk, may contain nuts\nPackaging: Recyclable",
                "22.00", 0, false, false, false, 112, List.of("1481391319762-47dff72954d9"),
                List.of(c.get("wedding-souvenirs"), c.get("birthday-gifts"), c.get("gift-boxes")),
                pz(true, false, true, true, false, false, "0.00"));
        product("The Botanical Ritual Box", "A calming set of botanical skincare, beautifully boxed.",
                "Hand cream, body oil and a botanical balm, nestled in our ivory gift box with a message card.",
                "Includes: 3 full-size products\nScent: Neroli & cedar\nVegan: Yes\nGift message: Included",
                "82.00", 25, true, false, true, 19, List.of("1571781926291-c477ebfd024b", "1620916566398-39f1143ab7be"),
                List.of(c.get("gift-boxes"), c.get("corporate-gifts")), pz(false, false, false, true, false, false, "0.00"));
        product("Pressed Bloom Keepsake Frame", "Preserve wedding or celebration flowers in a float frame.",
                "Send us blooms from your day and we will press and mount them in an oak float frame, finished with your names and date.",
                "Frame: Solid oak, 30 × 40 cm\nGlazing: Museum glass\nTurnaround: 6–8 weeks\nShipping kit: Provided",
                "120.00", 15, false, false, true, 8, List.of("1525310072745-f49212b5ac6d"),
                List.of(c.get("wedding-souvenirs"), c.get("personalised-gifts")), pz(true, false, true, false, false, true, "0.00"));
    }

    private ProductPersonalisation pz(boolean name, boolean initials, boolean date, boolean message, boolean logo,
                                      boolean eventDetails, String extra) {
        ProductPersonalisation p = new ProductPersonalisation();
        p.setAllowName(name);
        p.setAllowInitials(initials);
        p.setAllowDate(date);
        p.setAllowMessage(message);
        p.setAllowLogo(logo);
        p.setAllowEventDetails(eventDetails);
        p.setAllowInstructions(true);
        p.setExtraCost(new BigDecimal(extra));
        return p;
    }

    private void product(String name, String shortDesc, String desc, String specs, String price, int stock,
                         boolean featured, boolean bestseller, boolean newArrival, int sold, List<String> imageIds,
                         List<Category> cats, ProductPersonalisation pz) {
        Product p = new Product();
        p.setName(name);
        p.setSlug(com.licht.souvenirs.service.CatalogService.slugify(name));
        p.setShortDescription(shortDesc);
        p.setDescription(desc);
        p.setSpecifications(specs);
        p.setPrice(new BigDecimal(price));
        p.setStock(stock);
        p.setFeatured(featured);
        p.setBestseller(bestseller);
        p.setNewArrival(newArrival);
        p.setSoldCount(sold);
        p.getCategories().addAll(cats);
        int i = 0;
        for (String id : imageIds) p.getImages().add(new ProductImage(p, img(id, 1200), name, i++));
        p.setPersonalisation(pz);
        products.save(p);
    }

    private void seedTestimonials() {
        String[][] rows = {
                {"Placeholder — Customer name", "Wedding favours", "Replace this with a real customer review from the admin dashboard. Edit or deactivate placeholder testimonials before launch."},
                {"Placeholder — Customer name", "Corporate gifting", "This is sample text showing how a client quote will appear in the carousel. Add genuine reviews under Admin → Testimonials."},
                {"Placeholder — Customer name", "Birthday gift", "Sample testimonial. Real reviews, ratings and names should only be added with the customer's permission."},
        };
        int i = 0;
        for (String[] r : rows) {
            Testimonial t = new Testimonial();
            t.setAuthorName(r[0]);
            t.setOccasion(r[1]);
            t.setQuote(r[2]);
            t.setRating(5);
            t.setPlaceholder(true);
            t.setSortOrder(i++);
            testimonials.save(t);
        }
    }

    private void seedFaqs() {
        String[][] rows = {
                {"Personalisation", "What can be personalised?", "Most pieces can carry names, initials, dates or a short message. Selected products also accept logos and event details. Only the options a product supports are shown on its page."},
                {"Personalisation", "Will I see a proof before production?", "For logo and custom-design orders we email a digital proof for approval before anything is made."},
                {"Bulk orders", "Do you offer bulk or event pricing?", "Yes. For orders of 20 or more pieces, request a quote and we will prepare tiered pricing for your quantity."},
                {"Custom orders", "Can you create something completely bespoke?", "We love bespoke commissions. Share your idea through the custom gift enquiry form and our studio will advise on materials, timing and cost."},
                {"Ordering timelines", "How far in advance should I order?", "Allow 3–10 working days for personalised items and 3–6 weeks for large event orders. Lead times are listed on each product."},
                {"Delivery", "How is my order delivered?", "Orders are packed in protective outer cartons and sent with tracked delivery. Standard, express and studio collection options are offered at checkout."},
                {"Corporate gifting", "Can you deliver to multiple recipients?", "Yes — corporate orders can be shipped to a single office or to individual recipients from a spreadsheet you provide."},
                {"Quote requests", "How quickly will I receive a quote?", "We reply to every enquiry within two working days."},
                {"Payments", "Which payment methods do you accept?", "Payment options are shown at checkout. Card details are handled by our payment provider and never stored by us."},
                {"Returns and refunds", "Can I return a personalised item?", "Personalised items are made for you and cannot be returned unless they arrive damaged or faulty. Non-personalised items may be returned within 14 days in original condition."},
        };
        int i = 0;
        for (String[] r : rows) {
            Faq f = new Faq();
            f.setCategory(r[0]);
            f.setQuestion(r[1]);
            f.setAnswer(r[2]);
            f.setSortOrder(i++);
            faqs.save(f);
        }
    }

    private void seedCoupons() {
        Coupon c = new Coupon();
        c.setCode("WELCOME10");
        c.setType(Coupon.Type.PERCENT);
        c.setAmount(new BigDecimal("10"));
        coupons.save(c);
    }

    private void seedContent() throws Exception {
        put("store", Map.of("currency", "GBP", "locale", "en-GB",
                "note", "Placeholder currency — change under Admin → Content → store."));
        put("hero", map(
                "eyebrow", "Luxury souvenirs & personalised gifting",
                "headline", "Memorable Moments. Beautifully Preserved.",
                "subheadline", "From elegant event souvenirs to personalised gifts, LICHT SIGNATURE SOUVENIRS helps you celebrate life's special moments with gifts worth remembering.",
                "image", img("1608755728617-aefab37d2edd", 2200),
                "imageAlt", "A dark gift box tied with natural twine",
                "primaryCta", "Shop Now", "secondaryCta", "Explore Our Collection"));
        put("about", map(
                "heading", "More Than a Gift. It's a Memory.",
                "body", "LICHT Signature Souvenirs was founded on a simple belief: the most meaningful gifts are the ones that hold a moment. We curate, personalise and present every piece with the care of a keepsake — so an ordinary gift becomes something that is kept, remembered and treasured.",
                "body2", "Placeholder: add your founding story, studio and craft details here from the admin dashboard.",
                "image", img("1513201099705-a9746e1e201f", 1200),
                "image2", img("1610701596007-11502861dcfa", 900),
                "image3", img("1602874801007-bd458bb1b8b6", 900)));
        put("occasions", Map.of("items", List.of(
                occ("Weddings", "weddings", "1511285560929-80b456fea0bc", "wedding-souvenirs"),
                occ("Birthdays", "birthdays", "1512909006721-3d6018887383", "birthday-gifts"),
                occ("Anniversaries", "anniversaries", "1515934751635-c81c6bc9a2d8", "personalised-gifts"),
                occ("Baby Showers", "baby-showers", "1515488042361-ee00e0ddd4e4", "personalised-gifts"),
                occ("Christenings & Celebrations", "christenings", "1525310072745-f49212b5ac6d", "personalised-gifts"),
                occ("Graduations", "graduations", "1531346878377-a5be20888e57", "personalised-gifts"),
                occ("Corporate Events", "corporate-events", "1556761175-b413da4baf72", "corporate-gifts"),
                occ("Special Celebrations", "celebrations", "1511795409834-ef04bbd61622", "gift-boxes"))));
        put("giftBoxes", Map.of("items", List.of(
                box("The Signature Box", "Our house collection of small treasures.", "1608755728617-aefab37d2edd"),
                box("The Celebration Box", "Joyful pieces for birthdays and milestones.", "1549465220-1a8b9238cd48"),
                box("The Wedding Box", "For the couple, the party and the guests.", "1606800052052-a08af7148866"),
                box("The Corporate Box", "Polished gifting for clients and teams.", "1600857062241-98e5dba7f214"),
                box("The Luxury Box", "Our most indulgent, fully personalised.", "1599643478518-a784e5dc4c8f"))));
        put("instagram", map("handle", "@lichtsignature",
                "url", "https://instagram.com/",
                "note", "Placeholder handle and link — update in Admin → Content.",
                "images", List.of(img("1602874801007-bd458bb1b8b6", 600), img("1610701596007-11502861dcfa", 600),
                        img("1599643478518-a784e5dc4c8f", 600), img("1513201099705-a9746e1e201f", 600),
                        img("1481391319762-47dff72954d9", 600), img("1511795409834-ef04bbd61622", 600),
                        img("1544816155-12df9643f363", 600), img("1525310072745-f49212b5ac6d", 600))));
        put("contact", map(
                "email", "hello@licht-signature.example",
                "phone", "07831 082965",
                "hours", "Mon–Fri, 9:00–17:30"));
        put("corporate", map(
                "heading", "Corporate Gifting, With a Signature Touch.",
                "body", "From welcome kits to client appreciation and milestone celebrations, we design branded gifts that feel personal — with logo personalisation, multi-address delivery and a dedicated studio contact.",
                "image", img("1556761175-b413da4baf72", 1400),
                "points", List.of("Logo embossing & foil stamping", "Curated gift boxes in your brand palette", "Delivery to one office or many recipients", "Invoicing and dedicated account support")));
        put("personalised", map(
                "heading", "Make It Personal.",
                "body", "Every piece can carry the details that make it yours — finished by hand in our studio.",
                "image", img("1531346878377-a5be20888e57", 1400),
                "options", List.of("Names", "Dates", "Initials", "Messages", "Logos", "Event details", "Custom designs")));
        put("bulk", map(
                "heading", "Planning an Event? Let Us Help.",
                "body", "Weddings, conferences, launches and celebrations — we produce beautifully consistent souvenirs at scale, with tiered pricing and a single point of contact.",
                "tiers", List.of("20", "50", "100", "500+"),
                "image", img("1511795409834-ef04bbd61622", 1600)));
    }

    private Map<String, Object> occ(String title, String slug, String imageId, String category) {
        return map("title", title, "slug", slug, "image", img(imageId, 900), "category", category);
    }

    private Map<String, Object> box(String title, String desc, String imageId) {
        return map("title", title, "description", desc, "image", img(imageId, 900), "link", "/shop/gift-boxes");
    }

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private void put(String key, Object value) throws Exception {
        content.putIfAbsent(key, json.writeValueAsString(value));
    }
}
