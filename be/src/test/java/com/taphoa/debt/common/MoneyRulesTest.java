package com.taphoa.debt.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class MoneyRulesTest {

    @Test
    void acceptsMultiplesOf500() {
        assertThat(MoneyRules.isMultipleOf500(BigDecimal.ZERO)).isTrue();
        assertThat(MoneyRules.isMultipleOf500(new BigDecimal("500"))).isTrue();
        assertThat(MoneyRules.isMultipleOf500(new BigDecimal("7000"))).isTrue();
        assertThat(MoneyRules.isMultipleOf500(new BigDecimal("7500.00"))).isTrue();
    }

    @Test
    void rejectsNonMultiples() {
        assertThat(MoneyRules.isMultipleOf500(new BigDecimal("7001"))).isFalse();
        assertThat(MoneyRules.isMultipleOf500(new BigDecimal("7250"))).isFalse();
        assertThat(MoneyRules.isMultipleOf500(new BigDecimal("-500"))).isFalse();
        assertThat(MoneyRules.isMultipleOf500(null)).isFalse();
    }

    @Test
    void requireThrowsClearMessage() {
        assertThatThrownBy(() -> MoneyRules.requireSellPriceMultipleOf500(new BigDecimal("7001"), "Đơn giá"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("500")
                .hasMessageContaining("7001");
    }
}
