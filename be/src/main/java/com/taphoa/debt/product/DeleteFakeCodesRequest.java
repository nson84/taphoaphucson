package com.taphoa.debt.product;

import jakarta.validation.constraints.NotBlank;

public record DeleteFakeCodesRequest(
        @NotBlank(message = "Vui lòng nhập mã PIN")
        String pin
) {
}
