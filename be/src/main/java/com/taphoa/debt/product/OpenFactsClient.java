package com.taphoa.debt.product;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Tra tên hàng theo mã vạch trên Open Food Facts / Open Beauty Facts / Open Products Facts.
 * Điều khoản OFF: mỗi lần gọi phải ứng với 1 thao tác của người dùng, không quét hàng loạt.
 */
@Component
public class OpenFactsClient {

    private static final Logger log = LoggerFactory.getLogger(OpenFactsClient.class);

    private static final String USER_AGENT = "TaphoaPhucSon/1.0 (shop POS; local)";
    private static final String FIELDS = "code,product_name,product_name_vi,product_name_en,brands,quantity";
    private static final List<Source> SOURCES = List.of(
            new Source("Open Food Facts", "https://world.openfoodfacts.org"),
            new Source("Open Beauty Facts", "https://world.openbeautyfacts.org"),
            new Source("Open Products Facts", "https://world.openproductsfacts.org")
    );

    private record Source(String name, String baseUrl) {
    }

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Map<String, Optional<NameSuggestionDto>> cache = new ConcurrentHashMap<>();

    public Optional<NameSuggestionDto> lookup(String code) {
        return cache.computeIfAbsent(code, this::fetch);
    }

    private Optional<NameSuggestionDto> fetch(String code) {
        for (Source source : SOURCES) {
            try {
                HttpRequest req = HttpRequest.newBuilder()
                        .uri(URI.create(source.baseUrl() + "/api/v2/product/" + code + ".json?fields=" + FIELDS))
                        .timeout(Duration.ofSeconds(8))
                        .header("User-Agent", USER_AGENT)
                        .GET()
                        .build();
                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
                if (res.statusCode() != 200) {
                    continue;
                }
                JsonNode root = mapper.readTree(res.body());
                if (root.path("status").asInt() != 1) {
                    continue;
                }
                JsonNode p = root.path("product");
                String name = firstText(p, "product_name_vi", "product_name", "product_name_en");
                if (name == null) {
                    continue;
                }
                return Optional.of(new NameSuggestionDto(
                        code, true, name, firstText(p, "brands"), firstText(p, "quantity"), source.name(), null));
            } catch (InterruptedException ex) {
                Thread.currentThread().interrupt();
                return Optional.empty();
            } catch (Exception ex) {
                log.debug("Open Facts lookup failed {} {}: {}", source.name(), code, ex.getMessage());
            }
        }
        return Optional.empty();
    }

    private static String firstText(JsonNode node, String... fields) {
        for (String f : fields) {
            String v = node.path(f).asText("").trim();
            if (!v.isEmpty()) {
                return v;
            }
        }
        return null;
    }
}
