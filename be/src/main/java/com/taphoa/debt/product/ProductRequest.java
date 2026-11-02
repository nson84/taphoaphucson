package com.taphoa.debt.product;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ProductRequest(
        /** Để trống = hàng không có mã vạch (BE tự cấp mã nội bộ). */
        @Size(max = 64, message = "Mã vạch tối đa 64 ký tự")
        String barcode,
        @Size(max = 64, message = "Mã hàng tối đa 64 ký tự")
        String sku,
        @NotBlank(message = "Tên hàng không được trống")
        @Size(max = 200, message = "Tên hàng tối đa 200 ký tự")
        String name,
        @Size(max = 80, message = "Nhóm hàng tối đa 80 ký tự")
        String category,
        @NotNull(message = "Giá nhập không được trống")
        @DecimalMin(value = "0", inclusive = true, message = "Giá nhập không được âm")
        BigDecimal costPrice,
        @NotNull(message = "Giá bán không được trống")
        @DecimalMin(value = "0", inclusive = true, message = "Giá bán không được âm")
        BigDecimal sellPrice,
        @NotNull(message = "Tồn kho không được trống")
        @Min(value = 0, message = "Tồn kho không được âm")
        Integer stockQty,
        @Size(max = 40, message = "Đơn vị cơ bản tối đa 40 ký tự")
        String unit,
        @Valid
        List<ProductUnitRequest> units,
        /** Kiểu dáng / màu sắc (tuỳ chọn). */
        @Valid
        List<ProductVariantRequest> variants,
        /** Mã quét thêm (ngoài barcode / sku). */
        List<@Size(max = 64) String> extraBarcodes,
        Boolean active
) {
}
