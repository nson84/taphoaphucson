package com.taphoa.debt.cards;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

public record CardOrderDto(
        Long id,
        String referenceNumber,
        String status,
        BigDecimal amount,
        String telco,
        Integer denomination,
        String vtcTransRef,
        String paymentType,
        LocalDateTime paidAt,
        LocalDateTime deliveredAt,
        Instant createdAt,
        String checkoutUrl,
        List<CardCodeDto> codes
) {
}
