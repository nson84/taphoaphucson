package com.taphoa.debt.debt;

import java.math.BigDecimal;

import com.taphoa.debt.common.MultipleOfThousand;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** Số tiền khách muốn trả — trừ lần lượt từ khoản còn nợ nhỏ nhất. */
public record PayAmountRequest(
        @NotNull(message = "Số tiền trả không được trống")
        @DecimalMin(value = "1000", inclusive = true, message = "Số tiền trả nợ phải trên 1.000 đ")
        @MultipleOfThousand
        BigDecimal amount
) {
}
