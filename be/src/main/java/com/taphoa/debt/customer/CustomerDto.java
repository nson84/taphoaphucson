package com.taphoa.debt.customer;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerDto(
        Long id,
        String name,
        String note,
        BigDecimal balance,
        Instant createdAt,
        Instant updatedAt
) {
}
