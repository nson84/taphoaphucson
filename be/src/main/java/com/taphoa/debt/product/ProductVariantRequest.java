package com.taphoa.debt.product;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ProductVariantRequest(
        /** Có id khi sửa biến thể đã tồn tại (giữ ảnh). */
        Long id,
        @NotBlank(message = "Tên kiểu dáng không được trống")
        @Size(max = 80, message = "Tên kiểu dáng tối đa 80 ký tự")
        String name,
        /** Null / bỏ trống = dùng giá bán chung của sản phẩm. */
        @DecimalMin(value = "0", inclusive = true, message = "Giá bán kiểu không được âm")
        BigDecimal sellPrice,
        /** Null / bỏ trống = dùng giá vốn chung của sản phẩm. */
        @DecimalMin(value = "0", inclusive = true, message = "Giá vốn kiểu không được âm")
        BigDecimal costPrice
) {
}
