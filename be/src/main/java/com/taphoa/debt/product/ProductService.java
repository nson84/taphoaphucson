package com.taphoa.debt.product;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.auth.PinService;
import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.common.MoneyRules;
import com.taphoa.debt.sale.SaleItemRepository;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final ProductBarcodeRepository productBarcodeRepository;
    private final SaleItemRepository saleItemRepository;
    private final OpenFactsClient openFactsClient;
    private final PinService pinService;
    private final ProductImageService productImageService;

    public ProductService(
            ProductRepository productRepository,
            ProductBarcodeRepository productBarcodeRepository,
            SaleItemRepository saleItemRepository,
            OpenFactsClient openFactsClient,
            PinService pinService,
            ProductImageService productImageService
    ) {
        this.productRepository = productRepository;
        this.productBarcodeRepository = productBarcodeRepository;
        this.saleItemRepository = saleItemRepository;
        this.openFactsClient = openFactsClient;
        this.pinService = pinService;
        this.productImageService = productImageService;
    }

    @Transactional
    public DeleteFakeCodesResult deleteFakeCodes(String pin) {
        pinService.verifyCurrentUserPin(pin);
        int deleted = 0;
        // Xóa hẳn mọi hàng mã ảo (kể cả đã bán / đã ngừng KD). Hóa đơn giữ snapshot tên+mã.
        for (Product p : productRepository.findByRealBarcode(false)) {
            saleItemRepository.detachProduct(p.getId());
            productRepository.delete(p);
            deleted++;
        }
        productRepository.flush();

        Map<Long, Product> stripped = new LinkedHashMap<>();
        for (ProductBarcode b : productBarcodeRepository.findAllWithProduct()) {
            Product p = b.getProduct();
            if (Boolean.TRUE.equals(p.getRealBarcode()) && !BarcodeUtil.isValidGtin(b.getCode())) {
                stripped.put(p.getId(), p);
            }
        }
        for (Product p : productRepository.findRealWithInternalSku()) {
            stripped.putIfAbsent(p.getId(), p);
        }
        for (Product p : stripped.values()) {
            p.getBarcodes().removeIf(b -> !BarcodeUtil.isValidGtin(b.getCode()));
        }
        productRepository.flush();
        for (Product p : stripped.values()) {
            if (p.getBarcodes().isEmpty() && !BarcodeUtil.isValidGtin(p.getBarcode())) {
                continue;
            }
            String primary = BarcodeUtil.isValidGtin(p.getBarcode())
                    ? p.getBarcode()
                    : p.getBarcodes().get(0).getCode();
            p.setBarcode(primary);
            p.setSku(primary);
            p.getBarcodes().forEach(b -> b.setKind(b.getCode().equals(primary) ? "PRIMARY" : "ALT"));
            p.refreshRealBarcode();
        }
        // deactivated giữ field API cũ = luôn 0 (không còn soft-delete mã ảo)
        return new DeleteFakeCodesResult(deleted, 0, stripped.size());
    }

    @Transactional(readOnly = true)
    public Page<ProductDto> search(String q, boolean activeOnly, String codeType, int page, int size) {
        String query = q == null ? "" : q.trim();
        String type = normalizeCodeType(codeType);
        var pageable = PageRequest.of(page, size);
        // Sort nằm trong JPQL (ưu tiên mã vạch / tên); không truyền Sort thêm
        Page<Product> result = "nocost".equals(type)
                ? productRepository.searchWithoutCostPrice(query, activeOnly, BigDecimal.ZERO, pageable)
                : productRepository.search(query, activeOnly, type, pageable);
        return result.map(ProductDto::from);
    }

    private static String normalizeCodeType(String raw) {
        if (raw == null || raw.isBlank()) {
            return "all";
        }
        String key = raw.trim().toLowerCase(Locale.ROOT);
        return switch (key) {
            case "fake", "real", "nocost", "barname", "nobarcode" -> key;
            default -> "all";
        };
    }

    @Transactional(readOnly = true)
    public Map<String, Long> codeStats() {
        long real = productRepository.countByRealBarcode(true);
        // Chỉ đếm mã ảo còn tồn tại (sau xóa hẳn phải = 0)
        long fake = productRepository.countByRealBarcode(false);
        return Map.of(
                "real", real,
                "fake", fake,
                "nobarcode", productRepository.countByHasPhysicalBarcode(false),
                "noCost", productRepository.countWithoutCostPrice(BigDecimal.ZERO),
                "barcodeName", productRepository.countNameIsBarcode(),
                "internalSku", productRepository.countRealWithInternalSku(),
                "total", productRepository.count());
    }

    @Transactional(readOnly = true)
    public NameSuggestionDto suggestName(Long id) {
        Product product = find(id);
        List<String> codes = new ArrayList<>();
        if (BarcodeUtil.isValidGtin(product.getBarcode())) {
            codes.add(product.getBarcode());
        }
        for (ProductBarcode b : product.getBarcodes()) {
            if (BarcodeUtil.isValidGtin(b.getCode()) && !codes.contains(b.getCode())) {
                codes.add(b.getCode());
            }
        }
        if (codes.isEmpty()) {
            return NameSuggestionDto.notFound(product.getBarcode(),
                    "Mã nội bộ / mã ảo, không tra được trên web. Hãy quét mã vạch thật trên bao bì.");
        }
        for (String code : codes) {
            var hit = openFactsClient.lookup(code);
            if (hit.isPresent()) {
                return hit.get();
            }
        }
        return NameSuggestionDto.notFound(codes.get(0),
                "Mã hợp lệ nhưng chưa có trên Open Food Facts (nhiều hàng Việt Nam chưa được cộng đồng nhập).");
    }

    @Transactional
    public ProductDto rename(Long id, String name) {
        Product product = find(id);
        product.setName(name.trim());
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional(readOnly = true)
    public ProductDto get(Long id) {
        return ProductDto.from(find(id));
    }

    @Transactional(readOnly = true)
    public ProductDto getByBarcode(String barcode) {
        String code = normalizeBarcode(barcode);
        Product product = productBarcodeRepository.findByCodeWithProduct(code)
                .map(ProductBarcode::getProduct)
                .orElseGet(() -> productRepository.findByBarcodeAndActiveTrue(code)
                        .orElseThrow(() -> new ApiException(
                                "Không tìm thấy hàng hóa với mã: " + code, HttpStatus.NOT_FOUND)));
        if (!product.isActive()) {
            throw new ApiException("Không tìm thấy hàng hóa với mã: " + code, HttpStatus.NOT_FOUND);
        }
        product.getUnits().size();
        product.getVariants().size();
        product.getBarcodes().size();
        return ProductDto.from(product);
    }

    /**
     * Mã này (mã chính hoặc mã phụ) đã thuộc hàng hóa nào chưa — kể cả hàng đã ngừng bán,
     * vì tạo/sửa vẫn bị chặn trùng với hàng đó. {@code excludeId}: bỏ qua chính hàng đang sửa.
     */
    @Transactional(readOnly = true)
    public BarcodeCheckDto checkBarcode(String barcode, Long excludeId) {
        if (barcode == null || barcode.isBlank()) {
            return BarcodeCheckDto.none();
        }
        String code = barcode.trim();
        Product found = productBarcodeRepository.findByCodeWithProduct(code)
                .map(ProductBarcode::getProduct)
                .orElseGet(() -> productRepository.findByBarcode(code).orElse(null));
        if (found == null || (excludeId != null && excludeId.equals(found.getId()))) {
            return BarcodeCheckDto.none();
        }
        return BarcodeCheckDto.of(found);
    }

    /**
     * Hàng không có mã vạch: tự cấp mã nội bộ là EAN-13 hợp lệ đầu số 29 (dải dùng nội bộ).
     * Mã hợp lệ nên không bị xếp vào "mã ảo" và không bị chức năng xóa mã ảo dọn đi; in nhãn quét được.
     */
    @Transactional
    public ProductDto createQuick(QuickProductRequest request) {
        ProductRequest full = new ProductRequest(
                null, null, request.name().trim(), null,
                request.costPrice() != null ? request.costPrice() : BigDecimal.ZERO,
                request.sellPrice(), 0, trimToNull(request.unit()), null, null, null, true);
        return create(full);
    }

    String nextInternalBarcode() {
        // Số thứ tự tăng dần: 29 + 10 chữ số (bắt đầu 1) + chữ số kiểm tra
        String max = productRepository.findMaxInternalBarcode();
        long seq = 0;
        if (max != null && max.matches("\\d{13}")) {
            seq = Long.parseLong(max.substring(2, 12));
        }
        for (int attempt = 0; attempt < 50; attempt++) {
            seq++;
            String code = BarcodeUtil.ean13FromPrefix12(String.format("29%010d", seq));
            if (!productRepository.existsByBarcode(code) && !productBarcodeRepository.existsByCode(code)) {
                return code;
            }
        }
        throw new ApiException("Không cấp được mã nội bộ, thử lại", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    @Transactional
    public ProductDto create(ProductRequest request) {
        validateSellPrices(request);
        boolean noPhysical = trimToNull(request.barcode()) == null;
        String barcode = noPhysical ? nextInternalBarcode() : normalizeBarcode(request.barcode());
        String sku = resolveSku(request.sku(), barcode);
        assertCodesAvailable(barcode, sku, request.extraBarcodes(), null);
        if (noPhysical) {
            assertNoBarcodeNameAvailable(request.name(), null);
        }
        Product product = new Product();
        product.setHasPhysicalBarcode(!noPhysical);
        apply(product, request, barcode, sku);
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public ProductDto update(Long id, ProductRequest request) {
        validateSellPrices(request);
        Product product = find(id);
        boolean noPhysical = trimToNull(request.barcode()) == null;
        String barcode;
        if (noPhysical) {
            barcode = !product.isHasPhysicalBarcode()
                    ? product.getBarcode()
                    : nextInternalBarcode();
        } else {
            barcode = normalizeBarcode(request.barcode());
        }
        String sku = resolveSku(request.sku(), barcode);
        assertCodesAvailable(barcode, sku, request.extraBarcodes(), id);
        if (noPhysical) {
            assertNoBarcodeNameAvailable(request.name(), id);
        }
        // Xóa mã/đơn vị cũ rồi flush trước khi ghi lại — tránh UNIQUE trùng khi Hibernate insert trước delete
        product.getBarcodes().clear();
        product.getUnits().clear();
        productRepository.saveAndFlush(product);
        product.setHasPhysicalBarcode(!noPhysical);
        apply(product, request, barcode, sku);
        return ProductDto.from(productRepository.save(product));
    }

    @Transactional
    public void delete(Long id) {
        Product product = find(id);
        if (saleItemRepository.existsByProductId(id)) {
            product.setActive(false);
            productRepository.save(product);
            return;
        }
        productRepository.delete(product);
    }

    Product find(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa", HttpStatus.NOT_FOUND));
        product.getUnits().size();
        product.getVariants().size();
        product.getBarcodes().size();
        return product;
    }

    private void apply(Product product, ProductRequest request, String barcode, String sku) {
        product.setBarcode(barcode);
        product.setSku(sku);
        product.setName(request.name().trim());
        product.setCategory(trimToNull(request.category()));
        product.setStockQty(request.stockQty());
        product.setActive(request.active() == null || request.active());

        List<ProductUnit> built = buildUnits(product, request);
        ProductUnit base = built.stream().filter(ProductUnit::isBase).findFirst()
                .orElseThrow(() -> new ApiException("Cần có đúng 1 đơn vị cơ bản", HttpStatus.BAD_REQUEST));

        product.setUnit(base.getName());
        product.setSellPrice(base.getSellPrice());
        product.setCostPrice(base.getCostPrice());
        product.replaceUnits(built);
        syncVariants(product, request.variants());
        product.replaceBarcodes(buildBarcodes(barcode, sku, request.extraBarcodes()));
    }

    private void validateSellPrices(ProductRequest request) {
        MoneyRules.requireSellPriceMultipleOf500(request.sellPrice(), "Giá bán");
        if (request.units() != null) {
            for (ProductUnitRequest u : request.units()) {
                if (u != null && u.sellPrice() != null) {
                    MoneyRules.requireSellPriceMultipleOf500(u.sellPrice(), "Giá bán đơn vị " + u.name());
                }
            }
        }
        if (request.variants() != null) {
            for (ProductVariantRequest v : request.variants()) {
                if (v != null && v.sellPrice() != null) {
                    MoneyRules.requireSellPriceMultipleOf500(
                            v.sellPrice(), "Giá bán kiểu «" + v.name() + "»");
                }
            }
        }
    }

    /**
     * Đồng bộ biến thể theo id: giữ ảnh của biến thể còn lại, xóa biến thể bỏ khỏi form.
     */
    private void syncVariants(Product product, List<ProductVariantRequest> reqs) {
        // null = client cũ / không gửi field → giữ nguyên; [] = xóa hết kiểu
        if (reqs == null) {
            return;
        }
        List<ProductVariant> existing = product.getVariants();
        if (reqs.isEmpty()) {
            for (ProductVariant removed : existing) {
                productImageService.deleteVariantImageFiles(removed.getId());
            }
            existing.clear();
            return;
        }
        Map<Long, ProductVariant> byId = new LinkedHashMap<>();
        for (ProductVariant v : existing) {
            if (v.getId() != null) {
                byId.put(v.getId(), v);
            }
        }
        List<ProductVariant> next = new ArrayList<>();
        int order = 0;
        for (ProductVariantRequest rv : reqs) {
            if (rv == null || rv.name() == null || rv.name().isBlank()) {
                continue;
            }
            String name = rv.name().trim();
            ProductVariant v = null;
            if (rv.id() != null) {
                v = byId.remove(rv.id());
            }
            if (v == null) {
                v = new ProductVariant();
                v.setProduct(product);
            }
            v.setName(name);
            v.setSellPrice(rv.sellPrice());
            v.setCostPrice(rv.costPrice());
            v.setSortOrder(order++);
            next.add(v);
        }
        for (ProductVariant removed : byId.values()) {
            productImageService.deleteVariantImageFiles(removed.getId());
        }
        existing.clear();
        existing.addAll(next);
    }

    private void assertNoBarcodeNameAvailable(String name, Long excludeId) {
        if (name == null || name.isBlank()) {
            return;
        }
        if (productRepository.countNoBarcodeByName(name.trim(), excludeId) > 0) {
            throw new ApiException(
                    "Đã có hàng không mã vạch trùng tên: " + name.trim(),
                    HttpStatus.BAD_REQUEST);
        }
    }

    private void assertCodesAvailable(String barcode, String sku, List<String> extras, Long productId) {
        if (productId == null) {
            if (productRepository.existsByBarcode(barcode) || productBarcodeRepository.existsByCode(barcode)) {
                throw new ApiException("Mã vạch đã tồn tại: " + barcode, HttpStatus.BAD_REQUEST);
            }
            if (productRepository.existsBySku(sku) || (!sku.equals(barcode) && productBarcodeRepository.existsByCode(sku))) {
                throw new ApiException("Mã hàng đã tồn tại: " + sku, HttpStatus.BAD_REQUEST);
            }
        } else {
            if (productRepository.existsByBarcodeAndIdNot(barcode, productId)
                    || productBarcodeRepository.existsByCodeAndProductIdNot(barcode, productId)) {
                throw new ApiException("Mã vạch đã tồn tại: " + barcode, HttpStatus.BAD_REQUEST);
            }
            if (productRepository.existsBySkuAndIdNot(sku, productId)
                    || (!sku.equals(barcode) && productBarcodeRepository.existsByCodeAndProductIdNot(sku, productId))) {
                throw new ApiException("Mã hàng đã tồn tại: " + sku, HttpStatus.BAD_REQUEST);
            }
        }
        if (extras != null) {
            for (String raw : extras) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                String code = raw.trim();
                if (code.equals(barcode) || code.equals(sku)) {
                    continue;
                }
                boolean taken = productId == null
                        ? productBarcodeRepository.existsByCode(code) || productRepository.existsByBarcode(code)
                        : productBarcodeRepository.existsByCodeAndProductIdNot(code, productId)
                                || productRepository.existsByBarcodeAndIdNot(code, productId);
                if (taken) {
                    throw new ApiException("Mã đã tồn tại: " + code, HttpStatus.BAD_REQUEST);
                }
            }
        }
    }

    static List<ProductBarcode> buildBarcodes(String barcode, String sku, List<String> extras) {
        Map<String, String> codes = new LinkedHashMap<>();
        codes.put(barcode, "PRIMARY");
        if (sku != null && !sku.isBlank() && !sku.equals(barcode)) {
            codes.put(sku, "SKU");
        }
        if (extras != null) {
            for (String raw : extras) {
                if (raw == null || raw.isBlank()) {
                    continue;
                }
                String code = raw.trim();
                codes.putIfAbsent(code, "ALT");
            }
        }
        List<ProductBarcode> result = new ArrayList<>();
        for (Map.Entry<String, String> e : codes.entrySet()) {
            ProductBarcode b = new ProductBarcode();
            b.setCode(e.getKey());
            b.setKind(e.getValue());
            result.add(b);
        }
        return result;
    }

    private List<ProductUnit> buildUnits(Product product, ProductRequest request) {
        List<ProductUnitRequest> reqUnits = request.units();
        List<ProductUnit> result = new ArrayList<>();

        if (reqUnits == null || reqUnits.isEmpty()) {
            String baseName = trimToNull(request.unit());
            if (baseName == null) {
                baseName = "Cái";
            }
            ProductUnit base = new ProductUnit();
            base.setName(baseName);
            base.setFactor(1);
            base.setSellPrice(request.sellPrice());
            base.setCostPrice(request.costPrice() != null ? request.costPrice() : BigDecimal.ZERO);
            base.setBase(true);
            base.setSortOrder(0);
            result.add(base);
            return result;
        }

        BigDecimal baseCost = request.costPrice() != null ? request.costPrice() : BigDecimal.ZERO;
        int order = 0;
        for (ProductUnitRequest ru : reqUnits) {
            String name = ru.name().trim();
            int factor = ru.factor() == null ? 1 : ru.factor();
            if (factor < 1) {
                throw new ApiException("Hệ số quy đổi phải >= 1", HttpStatus.BAD_REQUEST);
            }
            boolean isBase = Boolean.TRUE.equals(ru.base());
            ProductUnit u = new ProductUnit();
            u.setName(name);
            u.setFactor(isBase ? 1 : factor);
            u.setSellPrice(ru.sellPrice());
            BigDecimal cost = ru.costPrice();
            if (cost == null) {
                cost = isBase ? baseCost : baseCost.multiply(BigDecimal.valueOf(u.getFactor()));
            }
            u.setCostPrice(cost);
            u.setBase(isBase);
            u.setSortOrder(order++);
            result.add(u);
        }

        long baseCount = result.stream().filter(ProductUnit::isBase).count();
        if (baseCount == 0) {
            ProductUnit first = result.get(0);
            first.setBase(true);
            first.setFactor(1);
            baseCount = 1;
        }
        if (baseCount != 1) {
            throw new ApiException("Chỉ được có đúng 1 đơn vị cơ bản", HttpStatus.BAD_REQUEST);
        }
        return result;
    }

    static String normalizeBarcode(String barcode) {
        if (barcode == null || barcode.isBlank()) {
            throw new ApiException("Mã vạch không được trống", HttpStatus.BAD_REQUEST);
        }
        return barcode.trim();
    }

    static String resolveSku(String sku, String barcode) {
        String s = trimToNull(sku);
        return s != null ? s : barcode;
    }

    static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
