package com.taphoa.debt.product;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.taphoa.debt.common.ApiException;

@Service
public class ProductImageService {

    private static final Set<String> ALLOWED = Set.of("image/jpeg", "image/jpg", "image/png", "image/webp");

    private final ProductRepository productRepository;
    private final Path imageDir;

    public ProductImageService(
            ProductRepository productRepository,
            @Value("${TAPHOA_DATA_DIR:./data}") String dataDir
    ) {
        this.productRepository = productRepository;
        this.imageDir = Path.of(dataDir).toAbsolutePath().normalize().resolve("product-images");
    }

    public Path imageDir() {
        return imageDir;
    }

    @Transactional
    public ProductDto saveImage(Long productId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Chưa chọn ảnh", HttpStatus.BAD_REQUEST);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(contentType) && !looksLikeImageName(file.getOriginalFilename())) {
            throw new ApiException("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > 5 * 1024 * 1024L) {
            throw new ApiException("Ảnh tối đa 5MB", HttpStatus.BAD_REQUEST);
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));

        String ext = extensionFor(contentType, file.getOriginalFilename());
        String filename = productId + ext;
        try {
            Files.createDirectories(imageDir);
            Path target = imageDir.resolve(filename).normalize();
            if (!target.startsWith(imageDir)) {
                throw new ApiException("Tên file không hợp lệ", HttpStatus.BAD_REQUEST);
            }
            // Xóa file cũ khác đuôi nếu có
            deleteFilesForProduct(productId, filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ApiException("Không lưu được ảnh: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
        product.setImageFilename(filename);
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public ImageFile loadImage(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));
        String filename = product.getImageFilename();
        if (filename == null || filename.isBlank()) {
            throw new ApiException("Hàng hóa chưa có ảnh", HttpStatus.NOT_FOUND);
        }
        Path file = imageDir.resolve(filename).normalize();
        if (!file.startsWith(imageDir) || !Files.isRegularFile(file)) {
            throw new ApiException("Không tìm thấy file ảnh", HttpStatus.NOT_FOUND);
        }
        MediaType type = mediaTypeFor(filename);
        return new ImageFile(new FileSystemResource(file), type);
    }

    @Transactional
    public ProductDto deleteImage(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));
        deleteFilesForProduct(productId, null);
        product.setImageFilename(null);
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public ProductDto saveVariantImage(Long productId, Long variantId, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Chưa chọn ảnh", HttpStatus.BAD_REQUEST);
        }
        String contentType = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!ALLOWED.contains(contentType) && !looksLikeImageName(file.getOriginalFilename())) {
            throw new ApiException("Chỉ chấp nhận ảnh JPG, PNG hoặc WebP", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > 5 * 1024 * 1024L) {
            throw new ApiException("Ảnh tối đa 5MB", HttpStatus.BAD_REQUEST);
        }
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));
        product.getVariants().size();
        ProductVariant variant = product.getVariants().stream()
                .filter(v -> variantId.equals(v.getId()))
                .findFirst()
                .orElseThrow(() -> new ApiException("Không tìm thấy kiểu dáng", HttpStatus.NOT_FOUND));

        String ext = extensionFor(contentType, file.getOriginalFilename());
        String filename = "v" + variantId + ext;
        try {
            Files.createDirectories(imageDir);
            Path target = imageDir.resolve(filename).normalize();
            if (!target.startsWith(imageDir)) {
                throw new ApiException("Tên file không hợp lệ", HttpStatus.BAD_REQUEST);
            }
            deleteFilesForVariant(variantId, filename);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException e) {
            throw new ApiException("Không lưu được ảnh: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
        variant.setImageFilename(filename);
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public ImageFile loadVariantImage(Long productId, Long variantId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));
        product.getVariants().size();
        ProductVariant variant = product.getVariants().stream()
                .filter(v -> variantId.equals(v.getId()))
                .findFirst()
                .orElseThrow(() -> new ApiException("Không tìm thấy kiểu dáng", HttpStatus.NOT_FOUND));
        String filename = variant.getImageFilename();
        if (filename == null || filename.isBlank()) {
            throw new ApiException("Kiểu dáng chưa có ảnh", HttpStatus.NOT_FOUND);
        }
        Path file = imageDir.resolve(filename).normalize();
        if (!file.startsWith(imageDir) || !Files.isRegularFile(file)) {
            throw new ApiException("Không tìm thấy file ảnh", HttpStatus.NOT_FOUND);
        }
        return new ImageFile(new FileSystemResource(file), mediaTypeFor(filename));
    }

    @Transactional
    public ProductDto deleteVariantImage(Long productId, Long variantId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));
        product.getVariants().size();
        ProductVariant variant = product.getVariants().stream()
                .filter(v -> variantId.equals(v.getId()))
                .findFirst()
                .orElseThrow(() -> new ApiException("Không tìm thấy kiểu dáng", HttpStatus.NOT_FOUND));
        deleteFilesForVariant(variantId, null);
        variant.setImageFilename(null);
        return ProductDto.from(productRepository.save(product));
    }

    /** Xóa file ảnh đĩa khi biến thể bị gỡ khỏi sản phẩm. */
    public void deleteVariantImageFiles(Long variantId) {
        if (variantId == null) {
            return;
        }
        deleteFilesForVariant(variantId, null);
    }

    private void deleteFilesForVariant(Long variantId, String keepFilename) {
        if (!Files.isDirectory(imageDir)) {
            return;
        }
        String prefix = "v" + variantId + ".";
        String bare = "v" + variantId;
        try (var stream = Files.list(imageDir)) {
            stream.filter(p -> {
                String name = p.getFileName().toString();
                return name.startsWith(prefix) || name.equals(bare);
            }).forEach(p -> {
                if (keepFilename != null && p.getFileName().toString().equals(keepFilename)) {
                    return;
                }
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // bỏ qua lỗi xóa file cũ
                }
            });
        } catch (IOException ignored) {
            // thư mục chưa có
        }
    }

    private void deleteFilesForProduct(Long productId, String keepFilename) {
        if (!Files.isDirectory(imageDir)) {
            return;
        }
        String prefix = productId + ".";
        try (var stream = Files.list(imageDir)) {
            stream.filter(p -> {
                String name = p.getFileName().toString();
                return name.startsWith(prefix) || name.equals(String.valueOf(productId));
            }).forEach(p -> {
                if (keepFilename != null && p.getFileName().toString().equals(keepFilename)) {
                    return;
                }
                try {
                    Files.deleteIfExists(p);
                } catch (IOException ignored) {
                    // bỏ qua lỗi xóa file cũ
                }
            });
        } catch (IOException ignored) {
            // thư mục chưa có
        }
    }

    private static boolean looksLikeImageName(String name) {
        if (name == null) {
            return false;
        }
        String lower = name.toLowerCase(Locale.ROOT);
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png") || lower.endsWith(".webp");
    }

    private static String extensionFor(String contentType, String original) {
        if (contentType.contains("png")) {
            return ".png";
        }
        if (contentType.contains("webp")) {
            return ".webp";
        }
        if (original != null) {
            String lower = original.toLowerCase(Locale.ROOT);
            if (lower.endsWith(".png")) {
                return ".png";
            }
            if (lower.endsWith(".webp")) {
                return ".webp";
            }
        }
        return ".jpg";
    }

    private static MediaType mediaTypeFor(String filename) {
        String lower = filename.toLowerCase(Locale.ROOT);
        if (lower.endsWith(".png")) {
            return MediaType.IMAGE_PNG;
        }
        if (lower.endsWith(".webp")) {
            return MediaType.parseMediaType("image/webp");
        }
        return MediaType.IMAGE_JPEG;
    }

    public record ImageFile(Resource resource, MediaType mediaType) {
    }
}
