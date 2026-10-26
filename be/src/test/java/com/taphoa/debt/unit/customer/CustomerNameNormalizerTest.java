package com.taphoa.debt.unit.customer;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import com.taphoa.debt.customer.CustomerNameNormalizer;

class CustomerNameNormalizerTest {

    @ParameterizedTest
    @CsvSource({
            "'  Sơn  ', Sơn",
            "'Nguyễn   Văn   An', Nguyễn Văn An",
            "'A', A"
    })
    void normalize_trimsAndCollapsesSpaces(String raw, String expected) {
        assertThat(CustomerNameNormalizer.normalize(raw)).isEqualTo(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t"})
    void normalize_blankBecomesEmpty(String raw) {
        assertThat(CustomerNameNormalizer.normalize(raw)).isEmpty();
    }

    @Test
    void normalize_samePersonDifferentSpacing() {
        assertThat(CustomerNameNormalizer.normalize(" Sơn "))
                .isEqualTo(CustomerNameNormalizer.normalize("Sơn"));
    }
}
