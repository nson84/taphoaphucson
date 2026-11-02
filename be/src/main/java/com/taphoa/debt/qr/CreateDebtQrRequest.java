package com.taphoa.debt.qr;

import java.math.BigDecimal;

import com.taphoa.debt.common.MultipleOfThousand;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record CreateDebtQrRequest(
        @NotNull(message = "Số tiền QR không được trống")
        @DecimalMin(value = "1000", inclusive = true, message = "Khoản nợ không thể dưới 1.000 đ")
        @MultipleOfThousand
        BigDecimal amount
) {
}
