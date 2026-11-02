package com.taphoa.debt.sale;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record SaleReportDto(
        BigDecimal revenue,
        BigDecimal cost,
        BigDecimal profit,
        long saleCount,
        BigDecimal debtTotal,
        Map<String, BigDecimal> revenueByPaymentMethod,
        List<DailyRow> byDay
) {
    public record DailyRow(
            String date,
            BigDecimal revenue,
            BigDecimal cost,
            BigDecimal profit,
            long saleCount
    ) {
    }
}
