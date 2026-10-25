package com.taphoa.debt.debt;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateDebtRequest(
        @NotBlank(message = "Tên khách không được trống") String customerName,
        String customerNote,
        @NotNull(message = "Số tiền nợ không được trống")
        @DecimalMin(value = "0.01", message = "Số tiền phải lớn hơn 0")
        BigDecimal amount,
        String productNote,
        LocalDateTime occurredAt
) {
}
