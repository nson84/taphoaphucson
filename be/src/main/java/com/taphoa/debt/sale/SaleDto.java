package com.taphoa.debt.sale;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record SaleDto(
        Long id,
        String code,
        Long customerId,
        String customerName,
        PaymentMethod paymentMethod,
        BigDecimal totalAmount,
        BigDecimal discountAmount,
        BigDecimal roundingAmount,
        BigDecimal paidAmount,
        BigDecimal debtAmount,
        BigDecimal costTotal,
        BigDecimal profit,
        String note,
        LocalDateTime occurredAt,
        LocalDateTime cancelledAt,
        Long debtId,
        List<SaleItemDto> items,
        Instant createdAt,
        Instant updatedAt
) {
}
