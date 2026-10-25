package com.taphoa.debt.debt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

public record DebtDto(
        Long id,
        Long customerId,
        String customerName,
        BigDecimal amount,
        String productNote,
        String customerNote,
        LocalDateTime occurredAt,
        boolean paid,
        LocalDateTime paidAt,
        Instant createdAt,
        Instant updatedAt
) {
}
