package com.taphoa.debt.cards;

import jakarta.validation.constraints.NotBlank;

public record FulfillCardOrderRequest(
        @NotBlank String pin,
        @NotBlank String serial,
        @NotBlank String code
) {
}
