package com.taphoa.debt.product;

import java.util.Map;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.taphoa.debt.common.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/products")
public class ProductController {

    private final ProductService productService;
    private final ProductImportService productImportService;
    private final ProductNormalizeService normalizeService;
    private final ProductImageService productImageService;

    public ProductController(
            ProductService productService,
            ProductImportService productImportService,
            ProductNormalizeService normalizeService,
            ProductImageService productImageService
    ) {
        this.normalizeService = normalizeService;
        this.productService = productService;
        this.productImportService = productImportService;
        this.productImageService = productImageService;
    }

    @GetMapping
    public PageResponse<ProductDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "false") boolean activeOnly,
            @RequestParam(defaultValue = "all") String codeType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return PageResponse.from(productService.search(q, activeOnly, codeType, page, size));
    }

    @GetMapping("/code-stats")
    public Map<String, Long> codeStats() {
        return productService.codeStats();
    }

    @PostMapping("/fake-codes/delete")
    public DeleteFakeCodesResult deleteFakeCodes(@Valid @RequestBody DeleteFakeCodesRequest request) {
        return productService.deleteFakeCodes(request.pin());
    }

    @GetMapping("/normalize/preview")
    public ProductNormalizeService.Preview normalizePreview(
            @RequestParam(defaultValue = "40") int limit,
            @RequestParam(required = false) String category
    ) {
        return normalizeService.preview(Math.min(Math.max(limit, 1), 10000), category);
    }

    @PostMapping("/normalize/apply")
    public ProductNormalizeService.ApplyResult normalizeApply(@Valid @RequestBody DeleteFakeCodesRequest request) {
        return normalizeService.apply(request.pin());
    }

    @GetMapping("/{id}/name-suggestion")
    public NameSuggestionDto nameSuggestion(@PathVariable Long id) {
        return productService.suggestName(id);
    }

    @PatchMapping("/{id}/name")
    public ProductDto rename(@PathVariable Long id, @Valid @RequestBody RenameProductRequest request) {
        return productService.rename(id, request.name());
    }

    @PostMapping("/import")
    public ProductImportResult importExcel(@RequestParam("file") MultipartFile file) {
        return productImportService.importExcel(file);
    }

    @GetMapping("/barcode-check")
    public BarcodeCheckDto barcodeCheck(
            @RequestParam String code,
            @RequestParam(required = false) Long excludeId
    ) {
        return productService.checkBarcode(code, excludeId);
    }

    @PostMapping(value = "/{id}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductDto uploadImage(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return productImageService.saveImage(id, file);
    }

    @GetMapping("/{id}/image")
    public ResponseEntity<Resource> getImage(@PathVariable Long id) {
        ProductImageService.ImageFile img = productImageService.loadImage(id);
        return ResponseEntity.ok()
                .contentType(img.mediaType())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(img.resource());
    }

    @DeleteMapping("/{id}/image")
    public ProductDto deleteImage(@PathVariable Long id) {
        return productImageService.deleteImage(id);
    }

    @PostMapping(value = "/{id}/variants/{variantId}/image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ProductDto uploadVariantImage(
            @PathVariable Long id,
            @PathVariable Long variantId,
            @RequestParam("file") MultipartFile file
    ) {
        return productImageService.saveVariantImage(id, variantId, file);
    }

    @GetMapping("/{id}/variants/{variantId}/image")
    public ResponseEntity<Resource> getVariantImage(@PathVariable Long id, @PathVariable Long variantId) {
        ProductImageService.ImageFile img = productImageService.loadVariantImage(id, variantId);
        return ResponseEntity.ok()
                .contentType(img.mediaType())
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=3600")
                .body(img.resource());
    }

    @DeleteMapping("/{id}/variants/{variantId}/image")
    public ProductDto deleteVariantImage(@PathVariable Long id, @PathVariable Long variantId) {
        return productImageService.deleteVariantImage(id, variantId);
    }

    @GetMapping("/{id}")
    public ProductDto get(@PathVariable Long id) {
        return productService.get(id);
    }

    @GetMapping("/by-barcode/{barcode}")
    public ProductDto byBarcode(@PathVariable String barcode) {
        return productService.getByBarcode(barcode);
    }

    @PostMapping("/quick")
    public ProductDto createQuick(@Valid @RequestBody QuickProductRequest request) {
        return productService.createQuick(request);
    }

    @PostMapping
    public ProductDto create(@Valid @RequestBody ProductRequest request) {
        return productService.create(request);
    }

    @PutMapping("/{id}")
    public ProductDto update(@PathVariable Long id, @Valid @RequestBody ProductRequest request) {
        return productService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        productService.delete(id);
    }
}
