package com.taphoa.debt.customer;

import jakarta.validation.constraints.NotBlank;

public record CustomerRequest(
        @NotBlank(message = "Tên khách không được trống") String name,
        String note
) {
}
