package com.taphoa.debt.debt;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import com.taphoa.debt.common.MultipleOfThousand;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record CreateDebtRequest(
        @NotNull(message = "Loại nợ không được trống")
        DebtType debtType,
        @NotBlank(message = "Tên khách / công ty không được trống")
        @Size(max = 80, message = "Tên khách / công ty tối đa 80 ký tự")
        String customerName,
        @Size(max = 80, message = "Tham chiếu (bố mẹ/ông bà/xưởng) tối đa 80 ký tự")
        String parentName,
        @NotBlank(message = "Tên người lấy không được trống")
        @Size(max = 80, message = "Tên người lấy tối đa 80 ký tự")
        String pickerName,
        @NotNull(message = "Số tiền nợ không được trống")
        @DecimalMin(value = "1000", inclusive = true, message = "Số tiền nợ tối thiểu là 1.000 đ")
        @DecimalMax(value = "10000000", inclusive = true, message = "Số tiền nợ tối đa là 10.000.000 đ")
        @MultipleOfThousand
        BigDecimal amount,
        @Size(max = 200, message = "Ghi chú sản phẩm tối đa 200 ký tự")
        String productNote,
        @NotNull(message = "Ngày giờ không được trống") LocalDateTime occurredAt
) {
}
