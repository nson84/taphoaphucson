package com.taphoa.debt.unit.debt;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.taphoa.debt.debt.CreateDebtRequest;
import com.taphoa.debt.debt.DebtType;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;

class CreateDebtRequestValidationTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            validator = factory.getValidator();
        }
    }

    @Test
    void validRequest_noViolations() {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtType.PERSONAL,
                "Nguyễn An",
                null,
                "Con An",
                new BigDecimal("1000"),
                "gạo",
                LocalDateTime.of(2026, 10, 25, 10, 0)
        );
        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void amountBelowMin_rejected() {
        assertThat(messages(requestWithAmount("999"))).anyMatch(m -> m.contains("1.000"));
    }

    @Test
    void amountAboveMax_rejected() {
        assertThat(messages(requestWithAmount("10000001"))).anyMatch(m -> m.contains("10.000.000"));
    }

    @Test
    void negativeAmount_rejected() {
        assertThat(messages(requestWithAmount("-1000"))).isNotEmpty();
    }

    @Test
    void amountNotRoundThousand_rejected() {
        assertThat(messages(requestWithAmount("1001")))
                .anyMatch(m -> m.contains("1,500"));
    }

    @Test
    void amountRoundThousand_accepted() {
        assertThat(messages(requestWithAmount("5000"))).isEmpty();
        assertThat(messages(requestWithAmount("1500"))).isEmpty();
    }

    @Test
    void nameTooLong_rejected() {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtType.PERSONAL,
                "A".repeat(81),
                null,
                "Người lấy",
                new BigDecimal("1000"),
                null,
                LocalDateTime.now()
        );
        assertThat(messages(request)).anyMatch(m -> m.contains("80"));
    }

    @Test
    void productNoteTooLong_rejected() {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtType.COMPANY,
                "An",
                null,
                "Người lấy",
                new BigDecimal("1000"),
                "x".repeat(2001),
                LocalDateTime.now()
        );
        assertThat(messages(request)).anyMatch(m -> m.contains("2000"));
    }

    @Test
    void blankName_rejected() {
        CreateDebtRequest request = new CreateDebtRequest(
                DebtType.PERSONAL,
                "  ",
                null,
                "Người lấy",
                new BigDecimal("1000"),
                null,
                LocalDateTime.now()
        );
        assertThat(messages(request)).anyMatch(m -> m.contains("Tên khách"));
    }

    private CreateDebtRequest requestWithAmount(String amount) {
        return new CreateDebtRequest(
                DebtType.PERSONAL,
                "An",
                null,
                "Người lấy",
                new BigDecimal(amount),
                null,
                LocalDateTime.now()
        );
    }

    private Set<String> messages(CreateDebtRequest request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getMessage)
                .collect(java.util.stream.Collectors.toSet());
    }
}
