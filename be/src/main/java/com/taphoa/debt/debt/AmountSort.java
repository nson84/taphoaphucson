package com.taphoa.debt.debt;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

/** Sắp xếp theo số tiền: mặc định cao → thấp. */
public final class AmountSort {

    public static final String DESC = "amountDesc";
    public static final String ASC = "amountAsc";

    private AmountSort() {
    }

    public static boolean isDescending(String sort) {
        return sort == null || sort.isBlank() || !ASC.equalsIgnoreCase(sort.trim());
    }

    public static Pageable debtPageable(int page, int size, String sort) {
        boolean desc = isDescending(sort);
        Sort.Order paid = Sort.Order.asc("paid");
        Sort.Order amount = desc ? Sort.Order.desc("amount") : Sort.Order.asc("amount");
        Sort.Order id = desc ? Sort.Order.desc("id") : Sort.Order.asc("id");
        return PageRequest.of(page, size, Sort.by(paid, amount, id));
    }
}
