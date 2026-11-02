package com.taphoa.debt.product;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Bổ sung sku / product_barcodes / real_barcode cho dữ liệu tạo trước khi có các cột này.
 */
@Component
public class ProductBarcodeBackfill implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(ProductBarcodeBackfill.class);

    private final ProductRepository productRepository;

    public ProductBarcodeBackfill(ProductRepository productRepository) {
        this.productRepository = productRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        int fixed = 0;
        for (Product p : productRepository.findNeedingBackfill()) {
            if (p.getSku() == null || p.getSku().isBlank()) {
                p.setSku(p.getBarcode());
            }
            if (p.getBarcodes().isEmpty()) {
                p.replaceBarcodes(ProductService.buildBarcodes(p.getBarcode(), p.getSku(), null));
            } else {
                p.refreshRealBarcode();
            }
            fixed++;
        }
        if (fixed > 0) {
            log.info("Backfill product barcodes/sku/real_barcode: {} products", fixed);
        }
    }
}
