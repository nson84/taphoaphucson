package com.taphoa.debt.customer;

import java.math.BigDecimal;
import java.time.Instant;

public record CustomerDto(
        Long id,
        String name,
        String parentName,
        /** true nếu khách có ít nhất một khoản nợ loại công ty */
        boolean company,
        String note,
        BigDecimal balance,
        Instant createdAt,
        Instant updatedAt,
        /** true nếu khách đang nằm trong thùng rác (đã hết nợ) */
        boolean trashed
) {
}
