package com.licht.souvenirs.web;

import com.licht.souvenirs.repo.Repositories.CategoryRepository;
import com.licht.souvenirs.repo.Repositories.ProductRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** XML sitemap generated from the live catalogue. Proxy /sitemap.xml on the storefront domain to this. */
@RestController
public class SitemapController {
    private static final String[] STATIC_PATHS = {"", "/shop", "/about", "/occasions", "/personalised",
            "/corporate", "/gift-boxes", "/bulk-orders", "/contact", "/faq"};

    private final ProductRepository products;
    private final CategoryRepository categories;
    private final String site;

    public SitemapController(ProductRepository products, CategoryRepository categories,
                             @Value("${app.frontend-url}") String site) {
        this.products = products;
        this.categories = categories;
        this.site = site.endsWith("/") ? site.substring(0, site.length() - 1) : site;
    }

    @GetMapping(value = {"/sitemap.xml", "/api/sitemap.xml"}, produces = MediaType.APPLICATION_XML_VALUE)
    @Transactional(readOnly = true)
    public String sitemap() {
        StringBuilder sb = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (String p : STATIC_PATHS) url(sb, site + p, null);
        categories.findAll().forEach(c -> url(sb, site + "/shop/" + c.getSlug(), null));
        products.findAll().stream().filter(p -> p.isActive())
                .forEach(p -> url(sb, site + "/product/" + p.getSlug(), p.getUpdatedAt().toString().substring(0, 10)));
        return sb.append("</urlset>\n").toString();
    }

    private static String xml(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }

    private static void url(StringBuilder sb, String loc, String lastmod) {
        sb.append("  <url><loc>").append(xml(loc)).append("</loc>");
        if (lastmod != null) sb.append("<lastmod>").append(lastmod).append("</lastmod>");
        sb.append("</url>\n");
    }
}
