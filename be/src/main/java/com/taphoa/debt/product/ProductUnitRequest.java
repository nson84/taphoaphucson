package com.taphoa.debt.product;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductUnitRequest(
        Long id,
        @NotBlank(message = "Tên đơn vị không được trống")
        @Size(max = 40, message = "Tên đơn vị tối đa 40 ký tự")
        String name,
        @NotNull(message = "Hệ số quy đổi không được trống")
        @Min(value = 1, message = "Hệ số quy đổi tối thiểu là 1")
        Integer factor,
        @NotNull(message = "Giá bán đơn vị không được trống")
        @DecimalMin(value = "0", inclusive = true, message = "Giá bán đơn vị không được âm")
        BigDecimal sellPrice,
        @DecimalMin(value = "0", inclusive = true, message = "Giá vốn đơn vị không được âm")
        BigDecimal costPrice,
        Boolean base
) {
}
