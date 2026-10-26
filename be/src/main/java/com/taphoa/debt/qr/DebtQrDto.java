package com.taphoa.debt.qr;

import java.math.BigDecimal;
import java.time.Instant;

public record DebtQrDto(
        Long id,
        Long customerId,
        BigDecimal amount,
        String code,
        String transferContent,
        String displayContent,
        String qrImageUrl,
        String status,
        Instant createdAt
) {
}
