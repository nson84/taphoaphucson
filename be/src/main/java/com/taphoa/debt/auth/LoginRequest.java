package com.taphoa.debt.auth;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Username không được trống") String username,
        @NotBlank(message = "Password không được trống") String password
) {
}
