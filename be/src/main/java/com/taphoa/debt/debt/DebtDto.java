package com.taphoa.debt.debt;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

public record DebtDto(
        Long id,
        Long customerId,
        String customerName,
        String parentName,
        DebtType debtType,
        BigDecimal amount,
        String productNote,
        String pickerName,
        LocalDateTime occurredAt,
        boolean paid,
        LocalDateTime paidAt,
        Long saleId,
        Instant createdAt,
        Instant updatedAt
) {
}
