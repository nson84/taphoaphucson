package com.taphoa.debt.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangePinRequest(
        @NotBlank(message = "PIN hiện tại không được trống") String currentPin,
        @NotBlank(message = "PIN mới không được trống")
        @Pattern(regexp = "^\\d{4,8}$", message = "PIN mới phải gồm 4-8 chữ số")
        String newPin
) {
}
