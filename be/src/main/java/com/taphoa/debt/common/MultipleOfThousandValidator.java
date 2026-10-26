package com.taphoa.debt.common;

import java.math.BigDecimal;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class MultipleOfThousandValidator implements ConstraintValidator<MultipleOfThousand, BigDecimal> {

    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1000);

    @Override
    public boolean isValid(BigDecimal value, ConstraintValidatorContext context) {
        if (value == null) {
            return true; // @NotNull xử lý riêng
        }
        return value.remainder(THOUSAND).compareTo(BigDecimal.ZERO) == 0;
    }
}
