package com.taphoa.debt.settings;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record InventoryAlertRequest(
        @NotNull Boolean enabled,
        @NotNull @Min(1) @Max(9999) Integer threshold
) {
}
