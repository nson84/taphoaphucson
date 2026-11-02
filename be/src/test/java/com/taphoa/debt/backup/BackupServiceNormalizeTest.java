package com.taphoa.debt.backup;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class BackupServiceNormalizeTest {

    @Test
    void javaTimeValues_becomeIsoStrings_andSerializeWithPlainObjectMapper() throws Exception {
        Object dt = BackupService.normalizeValue(LocalDateTime.of(2026, 10, 28, 14, 5, 30));
        assertThat(dt).isEqualTo("2026-10-28T14:05:30");
        assertThat(BackupService.normalizeValue(LocalDate.of(2026, 10, 28))).isEqualTo("2026-10-28");
        assertThat(BackupService.normalizeValue(LocalTime.of(7, 30))).isEqualTo("07:30");
        assertThat(BackupService.normalizeValue(OffsetDateTime.of(2026, 10, 28, 1, 0, 0, 0, ZoneOffset.UTC)))
                .isEqualTo("2026-10-28T01:00Z");

        // ObjectMapper trần (như BackupService) không được ném lỗi
        assertThat(new ObjectMapper().writeValueAsString(dt)).isEqualTo("\"2026-10-28T14:05:30\"");
    }

    @Test
    void sqlTimeTypes_andBytes_andPlainValues() {
        assertThat(BackupService.normalizeValue(java.sql.Timestamp.valueOf("2026-10-28 14:05:30")))
                .isEqualTo("2026-10-28T14:05:30");
        assertThat(BackupService.normalizeValue(java.sql.Date.valueOf("2026-10-28"))).isEqualTo("2026-10-28");
        assertThat(BackupService.normalizeValue("xin chào".getBytes(StandardCharsets.UTF_8))).isEqualTo("xin chào");
        assertThat(BackupService.normalizeValue(new BigDecimal("1500.00"))).isEqualTo(new BigDecimal("1500.00"));
        assertThat(BackupService.normalizeValue(null)).isNull();
    }
}
