package com.taphoa.debt.sale;

import java.math.BigDecimal;

public record SaleItemDto(
        Long id,
        Long productId,
        String barcode,
        String productName,
        String variantName,
        int qty,
        String unitName,
        int unitFactor,
        Long productUnitId,
        BigDecimal unitPrice,
        BigDecimal costPrice,
        BigDecimal lineTotal
) {
    public static SaleItemDto from(SaleItem item) {
        return new SaleItemDto(
                item.getId(),
                item.getProduct() != null ? item.getProduct().getId() : null,
                item.getBarcode(),
                item.getProductName(),
                item.getVariantName(),
                item.getQty(),
                item.getUnitName(),
                item.getUnitFactor() <= 0 ? 1 : item.getUnitFactor(),
                item.getProductUnitId(),
                item.getUnitPrice(),
                item.getCostPrice(),
                item.getLineTotal()
        );
    }
}
