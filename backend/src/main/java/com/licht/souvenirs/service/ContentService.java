package com.licht.souvenirs.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.licht.souvenirs.domain.SiteContent;
import com.licht.souvenirs.repo.Repositories.SiteContentRepository;
import com.licht.souvenirs.web.ApiException;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Admin-managed content blocks keyed by name (hero, about, contact, instagram...). */
@Service
public class ContentService {
    private static final Pattern KEY = Pattern.compile("^[a-z][a-zA-Z0-9]{1,40}$");

    private final SiteContentRepository repo;
    private final ObjectMapper json;

    public ContentService(SiteContentRepository repo, ObjectMapper json) {
        this.repo = repo;
        this.json = json;
    }

    @Transactional(readOnly = true)
    public ObjectNode all() {
        ObjectNode out = json.createObjectNode();
        repo.findAll().forEach(c -> out.set(c.getKey(), parse(c.getJson())));
        return out;
    }

    @Transactional(readOnly = true)
    public JsonNode get(String key) {
        return repo.findByKey(key).map(c -> parse(c.getJson()))
                .orElseThrow(() -> ApiException.notFound("Content block"));
    }

    @Transactional
    public JsonNode put(String key, JsonNode value) {
        if (!KEY.matcher(key).matches()) throw ApiException.badRequest("Invalid content key.");
        if (value == null || !(value.isObject() || value.isArray())) {
            throw ApiException.badRequest("Content must be a JSON object or array.");
        }
        String s;
        try {
            s = json.writeValueAsString(value);
        } catch (Exception e) {
            throw ApiException.badRequest("Content could not be saved.");
        }
        if (s.length() > 20000) throw ApiException.badRequest("This content block is too large.");
        SiteContent c = repo.findByKey(key).orElseGet(() -> new SiteContent(key, s));
        c.setJson(s);
        repo.save(c);
        return value;
    }

    @Transactional
    public void putIfAbsent(String key, String rawJson) {
        if (repo.findByKey(key).isEmpty()) repo.save(new SiteContent(key, rawJson));
    }

    private JsonNode parse(String s) {
        try {
            return json.readTree(s);
        } catch (Exception e) {
            return json.createObjectNode();
        }
    }
}
