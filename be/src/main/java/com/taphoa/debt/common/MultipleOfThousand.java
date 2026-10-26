package com.taphoa.debt.common;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

@Documented
@Constraint(validatedBy = MultipleOfThousandValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface MultipleOfThousand {

    String message() default "Số tiền phải là số tròn nghìn (ví dụ 1.000, 2.000 — không nhập 1.001)";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
