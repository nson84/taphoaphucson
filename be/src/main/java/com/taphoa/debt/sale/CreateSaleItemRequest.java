package com.taphoa.debt.sale;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record CreateSaleItemRequest(
        @NotNull(message = "Sản phẩm không được trống")
        Long productId,
        @NotNull(message = "Số lượng không được trống")
        @Min(value = 1, message = "Số lượng tối thiểu là 1")
        Integer qty,
        /** Đơn vị bán (gói/thùng…). Null = đơn vị cơ bản. */
        Long productUnitId,
        /** Kiểu dáng / màu sắc (nếu hàng có nhiều kiểu). */
        Long variantId,
        /** Nếu có: dùng giá này thay giá bán đơn vị (POS sửa đơn giá). */
        @DecimalMin(value = "0", inclusive = true, message = "Đơn giá không được âm")
        BigDecimal unitPrice
) {
}
