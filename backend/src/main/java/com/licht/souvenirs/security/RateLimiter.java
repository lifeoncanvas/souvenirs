package com.licht.souvenirs.security;

import com.licht.souvenirs.web.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Small in-memory sliding-window limiter for public, abuse-prone endpoints
 * (sign-in, enquiries, uploads). Use a shared store such as Redis when running several instances.
 * The client address comes from {@code getRemoteAddr()}, which honours X-Forwarded-For only from
 * trusted proxies (see server.forward-headers-strategy).
 */
@Component
public class RateLimiter {
    private static final int SWEEP_THRESHOLD = 100_000;

    private final Map<String, Window> windows = new ConcurrentHashMap<>();

    private static final class Window {
        final Deque<Long> hits = new ArrayDeque<>();
        final long lengthMillis;

        Window(long lengthMillis) {
            this.lengthMillis = lengthMillis;
        }

        /** Drops hits older than the window; true when nothing is left. */
        boolean prune(long now) {
            long cutoff = now - lengthMillis;
            while (!hits.isEmpty() && hits.peekFirst() < cutoff) hits.pollFirst();
            return hits.isEmpty();
        }
    }

    public void check(HttpServletRequest req, String bucket, int maxHits, long windowSeconds) {
        String key = bucket + ":" + req.getRemoteAddr();
        long now = System.currentTimeMillis();
        if (windows.size() > SWEEP_THRESHOLD) sweep();
        Window w = windows.computeIfAbsent(key, k -> new Window(windowSeconds * 1000));
        synchronized (w) {
            w.prune(now);
            if (w.hits.size() >= maxHits) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Please wait a moment and try again.");
            }
            w.hits.addLast(now);
        }
    }

    /** Forgets clients whose windows have fully expired, keeping memory bounded without resetting live limits. */
    @Scheduled(fixedDelay = 60_000)
    public void sweep() {
        long now = System.currentTimeMillis();
        windows.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                return e.getValue().prune(now);
            }
        });
    }
}
