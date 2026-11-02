package com.taphoa.debt.product;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProductImportWriter {

    public record UpsertResult(boolean created, int barcodeCount) {
    }

    private final ProductRepository productRepository;
    private final ProductBarcodeRepository productBarcodeRepository;

    public ProductImportWriter(
            ProductRepository productRepository,
            ProductBarcodeRepository productBarcodeRepository
    ) {
        this.productRepository = productRepository;
        this.productBarcodeRepository = productBarcodeRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public UpsertResult upsert(
            String sku,
            String barcode,
            Set<String> codes,
            String productName,
            String category,
            BigDecimal sell,
            BigDecimal cost,
            int stock,
            String unit,
            boolean active
    ) {
        if (codesConflict(codes, sku)) {
            throw new IllegalStateException("mã đã thuộc hàng khác");
        }

        Product product = productRepository.findBySku(sku).orElse(null);
        boolean isNew = product == null;
        if (isNew) {
            product = new Product();
        } else {
            // Load + xóa collection trước để tránh insert trùng UNIQUE(code)
            product.getBarcodes().size();
            product.getUnits().size();
            product.getBarcodes().clear();
            product.getUnits().clear();
            productRepository.saveAndFlush(product);
        }

        product.setSku(sku);
        product.setBarcode(barcode);
        product.setName(productName);
        product.setCategory(ProductService.trimToNull(category));
        product.setSellPrice(sell);
        product.setCostPrice(cost);
        product.setStockQty(Math.max(0, stock));
        product.setUnit(unit);
        product.setActive(active);

        ProductUnit base = new ProductUnit();
        base.setName(unit);
        base.setFactor(1);
        base.setSellPrice(sell);
        base.setCostPrice(cost);
        base.setBase(true);
        base.setSortOrder(0);
        product.replaceUnits(List.of(base));

        List<String> extras = new ArrayList<>();
        for (String c : codes) {
            if (!c.equals(barcode) && !c.equals(sku)) {
                extras.add(c);
            }
        }
        List<ProductBarcode> built = ProductService.buildBarcodes(barcode, sku, extras);
        product.replaceBarcodes(built);
        productRepository.save(product);
        return new UpsertResult(isNew, built.size());
    }

    private boolean codesConflict(Set<String> codes, String sku) {
        Product existingSku = productRepository.findBySku(sku).orElse(null);
        Long keepId = existingSku != null ? existingSku.getId() : null;
        for (String code : codes) {
            if (keepId == null) {
                if (productBarcodeRepository.existsByCode(code)) {
                    return true;
                }
                Product byBarcode = productRepository.findByBarcode(code).orElse(null);
                if (byBarcode != null) {
                    return true;
                }
            } else {
                if (productBarcodeRepository.existsByCodeAndProductIdNot(code, keepId)) {
                    return true;
                }
                Product byBarcode = productRepository.findByBarcode(code).orElse(null);
                if (byBarcode != null && !byBarcode.getId().equals(keepId)) {
                    return true;
                }
            }
        }
        return false;
    }
}
