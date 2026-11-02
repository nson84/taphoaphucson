package com.taphoa.debt.product;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RenameProductRequest(
        @NotBlank(message = "Tên hàng không được trống")
        @Size(max = 200, message = "Tên hàng tối đa 200 ký tự")
        String name
) {
}
