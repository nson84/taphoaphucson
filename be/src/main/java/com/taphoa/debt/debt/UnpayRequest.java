package com.taphoa.debt.debt;

import jakarta.validation.constraints.NotBlank;

public record UnpayRequest(
        @NotBlank(message = "Vui lòng nhập mã PIN") String pin
) {
}
