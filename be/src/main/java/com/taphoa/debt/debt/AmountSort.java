package com.taphoa.debt.debt;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/**
 * Sắp xếp phiếu nợ: mặc định theo ngày (mới → cũ).
 * Vẫn hỗ trợ {@code amountDesc}/{@code amountAsc} cho API cũ / danh sách khách theo số tiền.
 */
public final class AmountSort {

    public static final String DESC = "amountDesc";
    public static final String ASC = "amountAsc";
    public static final String DATE_DESC = "dateDesc";
    public static final String DATE_ASC = "dateAsc";

    private AmountSort() {
    }

    /** true trừ khi sort là amountAsc hoặc dateAsc. */
    public static boolean isDescending(String sort) {
        if (sort == null || sort.isBlank()) {
            return true;
        }
        String s = sort.trim();
        return !ASC.equalsIgnoreCase(s) && !DATE_ASC.equalsIgnoreCase(s);
    }

    /** amountAsc / amountDesc → xếp theo số tiền; còn lại (kể cả mặc định) → theo ngày. */
    public static boolean isAmountSort(String sort) {
        if (sort == null || sort.isBlank()) {
            return false;
        }
        String s = sort.trim();
        return ASC.equalsIgnoreCase(s) || DESC.equalsIgnoreCase(s);
    }

    public static Pageable debtPageable(int page, int size, String sort) {
        boolean desc = isDescending(sort);
        Sort.Order paid = Sort.Order.asc("paid");
        Sort.Order id = desc ? Sort.Order.desc("id") : Sort.Order.asc("id");
        if (isAmountSort(sort)) {
            Sort.Order amount = desc ? Sort.Order.desc("amount") : Sort.Order.asc("amount");
            return PageRequest.of(page, size, Sort.by(paid, amount, id));
        }
        Sort.Order occurred = desc ? Sort.Order.desc("occurredAt") : Sort.Order.asc("occurredAt");
        return PageRequest.of(page, size, Sort.by(paid, occurred, id));
    }
}
