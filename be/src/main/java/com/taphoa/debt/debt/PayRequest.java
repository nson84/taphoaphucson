package com.taphoa.debt.debt;

import java.math.BigDecimal;

/**
 * amount = null → trả hết khoản đang chọn.
 * cascadeRemainder = true → phần dư sau khi trả hết khoản hiện tại tiếp tục trừ khoản nhỏ nhất còn lại.
 */
public record PayRequest(BigDecimal amount, Boolean cascadeRemainder) {
}
