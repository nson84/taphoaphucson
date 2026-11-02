package com.taphoa.debt.product;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Thêm nhanh hàng không có mã vạch ngay trên POS: hệ thống tự cấp mã nội bộ. */
public record QuickProductRequest(
        @NotBlank(message = "Tên hàng không được trống")
        @Size(max = 200, message = "Tên hàng tối đa 200 ký tự")
        String name,
        @NotNull(message = "Giá bán không được trống")
        @DecimalMin(value = "0", inclusive = true, message = "Giá bán không được âm")
        BigDecimal sellPrice,
        @DecimalMin(value = "0", inclusive = true, message = "Giá nhập không được âm")
        BigDecimal costPrice,
        @Size(max = 40, message = "Đơn vị tối đa 40 ký tự")
        String unit
) {
}
