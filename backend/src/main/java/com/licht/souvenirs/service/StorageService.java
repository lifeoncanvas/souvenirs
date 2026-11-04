package com.licht.souvenirs.service;

import com.licht.souvenirs.web.ApiException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Stream;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Stores uploaded images on local disk and serves them under /uploads.
 * Swap this implementation for Cloudinary or S3 in production; callers only depend on the returned URL.
 * Files are accepted by their magic bytes, never by the client-supplied name or content type.
 */
@Service
public class StorageService {
    private static final long MAX_BYTES = 8L * 1024 * 1024;
    /** Names produced by storeImage: a random UUID plus a sniffed image extension. */
    private static final Pattern STORED_NAME = Pattern.compile("^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\\.(jpg|png|webp)$");

    private final Path root;
    private final String publicBase;

    public StorageService(@Value("${app.storage.upload-dir}") String dir,
                          @Value("${app.storage.public-base-url}") String publicBase) throws IOException {
        this.root = Path.of(dir).toAbsolutePath().normalize();
        this.publicBase = publicBase.endsWith("/") ? publicBase.substring(0, publicBase.length() - 1) : publicBase;
        Files.createDirectories(root);
    }

    public Path root() { return root; }

    public String storeImage(MultipartFile file, String folder) {
        if (file == null || file.isEmpty()) throw ApiException.badRequest("Please choose a file to upload.");
        if (file.getSize() > MAX_BYTES) throw ApiException.badRequest("Images must be 8 MB or smaller.");
        String ext;
        try (InputStream in = file.getInputStream()) {
            ext = sniff(in.readNBytes(12));
        } catch (IOException e) {
            throw ApiException.badRequest("The file could not be read.");
        }
        if (ext == null) throw ApiException.badRequest("Only JPEG, PNG or WebP images are accepted.");
        String safeFolder = folder.replaceAll("[^a-z0-9-]", "");
        String name = UUID.randomUUID() + "." + ext;
        try {
            Path dir = root.resolve(safeFolder).normalize();
            if (!dir.startsWith(root)) throw ApiException.badRequest("Invalid folder.");
            Files.createDirectories(dir);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dir.resolve(name), StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new IllegalStateException("Could not store file", e);
        }
        return publicBase + "/" + safeFolder + "/" + name;
    }

    /** True when {@code url} is exactly a file this service stored in {@code folder} (no traversal, no foreign hosts). */
    public boolean isStoredUrl(String url, String folder) {
        if (url == null) return false;
        String prefix = publicBase + "/" + folder + "/";
        return url.startsWith(prefix) && STORED_NAME.matcher(url.substring(prefix.length())).matches();
    }

    /** Stored files in {@code folder} last modified before {@code cutoff}, as their public URLs. */
    public List<String> filesOlderThan(String folder, Instant cutoff) {
        Path dir = root.resolve(folder).normalize();
        if (!dir.startsWith(root) || !Files.isDirectory(dir)) return List.of();
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(Files::isRegularFile)
                    .filter(f -> STORED_NAME.matcher(f.getFileName().toString()).matches())
                    .filter(f -> {
                        try {
                            return Files.getLastModifiedTime(f).toInstant().isBefore(cutoff);
                        } catch (IOException e) {
                            return false;
                        }
                    })
                    .map(f -> publicBase + "/" + folder + "/" + f.getFileName())
                    .toList();
        } catch (IOException e) {
            return List.of();
        }
    }

    /** Deletes a file previously returned by {@link #storeImage}; ignores anything else. */
    public void delete(String url, String folder) {
        if (!isStoredUrl(url, folder)) return;
        Path file = root.resolve(folder).resolve(url.substring(url.lastIndexOf('/') + 1)).normalize();
        if (!file.startsWith(root)) return;
        try {
            Files.deleteIfExists(file);
        } catch (IOException e) {
            // Retried on the next cleanup run.
        }
    }

    private static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "jpg";
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "png";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "webp";
        return null;
    }
}
