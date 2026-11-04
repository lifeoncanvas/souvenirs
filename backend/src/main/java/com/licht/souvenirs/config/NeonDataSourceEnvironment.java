package com.licht.souvenirs.config;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Maps the Neon connection string to Spring datasource properties.
 *
 * <p>Neon's console hands out {@code postgresql://user:password@host/db?sslmode=require&channel_binding=require},
 * which the PostgreSQL JDBC driver cannot read directly (it has no user-info in URLs). This turns
 * {@code DATABASE_URL} into {@code spring.datasource.url/username/password}, forcing TLS.
 * A ready-made {@code jdbc:postgresql://...} URL is passed through unchanged.
 */
public class NeonDataSourceEnvironment implements EnvironmentPostProcessor, Ordered {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        if (Arrays.asList(env.getActiveProfiles()).contains("local")) return;
        if (env.containsProperty("spring.datasource.url")) return;

        String raw = env.getProperty("DATABASE_URL", "").trim();
        if (raw.isEmpty()) {
            throw new IllegalStateException("""

                    No database configured. Set DATABASE_URL to your Neon connection string, e.g. in backend/.env:
                      DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.REGION.aws.neon.tech/neondb?sslmode=require
                    (Neon console → your project → Connect.) To run offline on an embedded database instead,
                    start with SPRING_PROFILES_ACTIVE=local.
                    """);
        }

        Map<String, Object> props = new HashMap<>();
        if (raw.startsWith("jdbc:")) {
            props.put("spring.datasource.url", raw);
        } else if (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) {
            URI uri = URI.create(raw.replaceFirst("^postgres(ql)?://", "http://"));
            Map<String, String> query = parseQuery(uri.getRawQuery());
            // pgjdbc ignores libpq's channel_binding name; SCRAM channel binding is negotiated automatically.
            query.remove("channel_binding");
            query.putIfAbsent("sslmode", "require");
            String port = uri.getPort() > 0 ? ":" + uri.getPort() : "";
            String q = query.entrySet().stream().map(e -> e.getKey() + "=" + e.getValue()).collect(Collectors.joining("&"));
            props.put("spring.datasource.url", "jdbc:postgresql://" + uri.getHost() + port + uri.getRawPath() + "?" + q);
            String userInfo = uri.getRawUserInfo();
            if (userInfo != null) {
                int i = userInfo.indexOf(':');
                props.put("spring.datasource.username", decode(i < 0 ? userInfo : userInfo.substring(0, i)));
                if (i >= 0) props.put("spring.datasource.password", decode(userInfo.substring(i + 1)));
            }
        } else {
            throw new IllegalStateException("DATABASE_URL must start with postgresql:// (Neon) or jdbc:postgresql://");
        }
        // Explicit DATABASE_USERNAME / DATABASE_PASSWORD win over credentials embedded in the URL.
        String user = env.getProperty("DATABASE_USERNAME");
        String pass = env.getProperty("DATABASE_PASSWORD");
        if (user != null && !user.isBlank()) props.put("spring.datasource.username", user);
        if (pass != null && !pass.isBlank()) props.put("spring.datasource.password", pass);

        env.getPropertySources().addFirst(new MapPropertySource("neonDataSource", props));
    }

    private static Map<String, String> parseQuery(String q) {
        Map<String, String> m = new java.util.LinkedHashMap<>();
        if (q == null || q.isBlank()) return m;
        for (String part : q.split("&")) {
            int i = part.indexOf('=');
            if (i > 0) m.put(part.substring(0, i), part.substring(i + 1));
        }
        return m;
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    @Override
    public int getOrder() {
        // After Boot's config-data processing, so values imported from backend/.env are visible.
        return Ordered.LOWEST_PRECEDENCE;
    }
}
