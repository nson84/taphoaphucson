package com.taphoa.debt.settings;

public record InventoryAlertDto(
        boolean enabled,
        int threshold,
        long lowStockCount
) {
}
