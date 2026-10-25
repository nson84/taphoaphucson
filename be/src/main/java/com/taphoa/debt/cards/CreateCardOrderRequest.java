package com.taphoa.debt.cards;

import jakarta.validation.constraints.NotNull;

public record CreateCardOrderRequest(@NotNull Long productId) {
}
