package com.taphoa.debt.auth;

import jakarta.validation.constraints.NotBlank;

public record ChangePinRequest(
        @NotBlank(message = "PIN hiện tại không được trống") String currentPin,
        @NotBlank(message = "PIN mới không được trống") String newPin
) {
}
