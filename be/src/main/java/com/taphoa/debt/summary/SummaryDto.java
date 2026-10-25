package com.taphoa.debt.summary;

import java.math.BigDecimal;
import java.util.List;

import com.taphoa.debt.customer.CustomerDto;

public record SummaryDto(
        BigDecimal totalUnpaid,
        long customerCount,
        List<CustomerDto> customers,
        int page,
        int size,
        int totalPages
) {
}
