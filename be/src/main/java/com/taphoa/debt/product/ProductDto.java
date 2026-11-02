package com.taphoa.debt.product;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record ProductDto(
        Long id,
        String barcode,
        String sku,
        String name,
        String category,
        BigDecimal costPrice,
        BigDecimal sellPrice,
        int stockQty,
        String unit,
        boolean active,
        boolean realBarcode,
        boolean hasPhysicalBarcode,
        boolean hasImage,
        List<ProductUnitDto> units,
        List<ProductVariantDto> variants,
        List<String> barcodes,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductDto from(Product p) {
        List<ProductUnitDto> units = p.getUnits() == null
                ? List.of()
                : p.getUnits().stream().map(ProductUnitDto::from).toList();
        List<ProductVariantDto> variants = p.getVariants() == null
                ? List.of()
                : p.getVariants().stream().map(ProductVariantDto::from).toList();
        List<String> codes = p.getBarcodes() == null
                ? List.of()
                : p.getBarcodes().stream().map(ProductBarcode::getCode).distinct().toList();
        String image = p.getImageFilename();
        return new ProductDto(
                p.getId(),
                p.getBarcode(),
                p.getSku(),
                p.getName(),
                p.getCategory(),
                p.getCostPrice(),
                p.getSellPrice(),
                p.getStockQty(),
                p.getUnit(),
                p.isActive(),
                Boolean.TRUE.equals(p.getRealBarcode()),
                p.isHasPhysicalBarcode(),
                image != null && !image.isBlank(),
                units,
                variants,
                codes,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
