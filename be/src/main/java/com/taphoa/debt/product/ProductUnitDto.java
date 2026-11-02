package com.taphoa.debt.product;

import java.math.BigDecimal;

public record ProductUnitDto(
        Long id,
        String name,
        int factor,
        BigDecimal sellPrice,
        BigDecimal costPrice,
        boolean base,
        int sortOrder
) {
    public static ProductUnitDto from(ProductUnit u) {
        return new ProductUnitDto(
                u.getId(),
                u.getName(),
                u.getFactor(),
                u.getSellPrice(),
                u.getCostPrice(),
                u.isBase(),
                u.getSortOrder()
        );
    }
}
