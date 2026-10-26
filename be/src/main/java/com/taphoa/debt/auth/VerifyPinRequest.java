package com.taphoa.debt.auth;

import jakarta.validation.constraints.NotBlank;

public record VerifyPinRequest(
        @NotBlank(message = "Vui lòng nhập mã PIN") String pin
) {
}
