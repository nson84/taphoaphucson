package com.taphoa.debt.common;

import java.math.BigDecimal;

import org.springframework.http.HttpStatus;

/** Quy tắc tiền Việt Nam dùng chung (giá bán bước 500đ). */
public final class MoneyRules {

    public static final BigDecimal SELL_PRICE_STEP = new BigDecimal("500");

    public static final BigDecimal DEBT_MIN = new BigDecimal("1000");

    public static final String DEBT_UNDER_MIN_MESSAGE = "Khoản nợ không thể dưới 1.000 đ";

    public static final String MONEY_FORM_MESSAGE =
            "Số tiền của bạn chỉ được dưới dạng 1,000 hoặc 1,500";

    private MoneyRules() {
    }

    /** true nếu amount ≥ 0 và chia hết cho 500 (gồm 0). */
    public static boolean isMultipleOf500(BigDecimal amount) {
        if (amount == null) {
            return false;
        }
        if (amount.compareTo(BigDecimal.ZERO) < 0) {
            return false;
        }
        return amount.remainder(SELL_PRICE_STEP).compareTo(BigDecimal.ZERO) == 0;
    }

    /** Khoản nợ / số tiền trả: tối thiểu 1.000 đ và chỉ các mức 1.000, 1.500, 2.000… */
    public static void requireDebtAmountShape(BigDecimal amount) {
        if (amount == null || amount.compareTo(DEBT_MIN) < 0) {
            throw new ApiException(DEBT_UNDER_MIN_MESSAGE, HttpStatus.BAD_REQUEST);
        }
        if (!isMultipleOf500(amount)) {
            throw new ApiException(MONEY_FORM_MESSAGE, HttpStatus.BAD_REQUEST);
        }
    }

    public static void requireSellPriceMultipleOf500(BigDecimal amount, String fieldLabel) {
        if (!isMultipleOf500(amount)) {
            String label = fieldLabel == null || fieldLabel.isBlank() ? "Giá bán" : fieldLabel;
            String shown = amount == null ? "?" : amount.stripTrailingZeros().toPlainString();
            throw new ApiException(
                    label + " phải là bội số của 500đ (ví dụ 7.000, 7.500). Không chấp nhận " + shown + "đ",
                    HttpStatus.BAD_REQUEST);
        }
    }
}
