package com.taphoa.debt.product;

import java.math.BigDecimal;

public record ProductVariantDto(
        Long id,
        String name,
        boolean hasImage,
        BigDecimal sellPrice,
        BigDecimal costPrice,
        int sortOrder
) {
    public static ProductVariantDto from(ProductVariant v) {
        String image = v.getImageFilename();
        return new ProductVariantDto(
                v.getId(),
                v.getName(),
                image != null && !image.isBlank(),
                v.getSellPrice(),
                v.getCostPrice(),
                v.getSortOrder()
        );
    }
}
