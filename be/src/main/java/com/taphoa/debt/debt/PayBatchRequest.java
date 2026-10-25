package com.taphoa.debt.debt;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;

public record PayBatchRequest(
        @NotEmpty(message = "Chưa chọn khoản nợ nào") List<Long> ids
) {
}
