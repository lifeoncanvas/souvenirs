package com.licht.souvenirs;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.licht.souvenirs.domain.Product;
import com.licht.souvenirs.repo.Repositories.ProductRepository;
import com.licht.souvenirs.service.PayPalClient;
import java.math.BigDecimal;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** Boots the whole API on an in-memory database built by the Flyway migrations. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"local", "test"})
public abstract class ApiTestSupport {
    @Autowired protected MockMvc mvc;
    @Autowired protected ObjectMapper json;
    @Autowired protected ProductRepository products;

    /** PayPal is never called for real; tests that need it stub this mock. */
    @MockitoBean protected PayPalClient paypal;

    protected String remoteAddr = "10.0." + (int) (Math.random() * 250) + "." + (int) (Math.random() * 250);

    /** A plain response: status plus parsed JSON body. */
    protected record Res(int status, JsonNode body) {}

    protected static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8);
    }

    protected Product product(String price, int stock) {
        Product p = new Product();
        p.setName(unique("Keepsake"));
        p.setSlug(unique("keepsake"));
        p.setPrice(new BigDecimal(price));
        p.setStock(stock);
        p.setActive(true);
        return products.save(p);
    }

    protected Res call(HttpMethod method, String path, Object body, String token, String cartToken) throws Exception {
        MockHttpServletRequestBuilder req = request(method, path).with(r -> {
            r.setRemoteAddr(remoteAddr); // per-test client address, so rate limits don't leak between tests
            return r;
        });
        if (token != null) req.header("Authorization", "Bearer " + token);
        if (cartToken != null) req.header("X-Cart-Token", cartToken);
        if (body != null) req.contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(body));
        MvcResult r = mvc.perform(req).andReturn();
        String text = r.getResponse().getContentAsString();
        return new Res(r.getResponse().getStatus(), text.isBlank() ? json.createObjectNode() : json.readTree(text));
    }

    protected Res get(String path, String token) throws Exception {
        return call(HttpMethod.GET, path, null, token, null);
    }

    protected Res post(String path, Object body, String token) throws Exception {
        return call(HttpMethod.POST, path, body, token, null);
    }

    /** Registers a new customer and returns their login token. */
    protected String register(String email) throws Exception {
        Res r = post("/api/auth/register", Map.of("firstName", "Test", "email", email, "password", "Password123!"), null);
        if (r.status() != 200) throw new AssertionError("register failed: " + r);
        return r.body().get("token").asText();
    }

    protected String login(String email, String password) throws Exception {
        Res r = post("/api/auth/login", Map.of("email", email, "password", password), null);
        if (r.status() != 200) throw new AssertionError("login failed: " + r);
        return r.body().get("token").asText();
    }

    protected String adminToken() throws Exception {
        return login("admin@test.local", "AdminPass123!");
    }

    /** Adds a product to a bag (guest when token is null) and returns the bag's cart token. */
    protected String addToCart(Product p, int qty, String token, String cartToken) throws Exception {
        Res r = call(HttpMethod.POST, "/api/cart/items", Map.of("productId", p.getId(), "quantity", qty), token, cartToken);
        if (r.status() != 200) throw new AssertionError("add to cart failed: " + r);
        return r.body().get("token").asText();
    }

    protected Map<String, Object> checkoutBody(String email, String paymentMethod) {
        Map<String, Object> address = new LinkedHashMap<>();
        address.put("fullName", "Test Buyer");
        address.put("line1", "1 Studio Lane");
        address.put("city", "London");
        address.put("postalCode", "N1 1AA");
        address.put("country", "United Kingdom");
        address.put("isDefault", false);
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("email", email);
        b.put("customerName", "Test Buyer");
        b.put("shippingAddress", address);
        b.put("shippingMethod", "STANDARD");
        b.put("paymentMethod", paymentMethod);
        b.put("saveAddress", false);
        return b;
    }

    protected Res checkout(String cartToken, String token, String paymentMethod) throws Exception {
        return call(HttpMethod.POST, "/api/checkout", checkoutBody(unique("buyer") + "@test.local", paymentMethod),
                token, cartToken);
    }

    protected int stockOf(Product p) {
        return products.findById(p.getId()).orElseThrow().getStock();
    }
}
