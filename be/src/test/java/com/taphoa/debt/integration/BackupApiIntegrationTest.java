package com.taphoa.debt.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.fasterxml.jackson.databind.JsonNode;
import com.taphoa.debt.support.ApiTestSupport;

/**
 * API backup: tải file JSON toàn bộ bảng nghiệp vụ.
 * (Chuyển đổi cột thời gian: xem {@code BackupServiceNormalizeTest}. Backup dùng connection riêng nên
 * không thấy dữ liệu chưa commit của test giao dịch — chỉ kiểm tra cấu trúc file.)
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackupApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void download_returnsJsonWithBusinessTables_andNoSystemTables() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/settings/backup/download")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode json = ApiTestSupport.MAPPER.readTree(res.getResponse().getContentAsByteArray());
        JsonNode tables = json.path("tables");
        assertThat(tables.isObject()).isTrue();
        assertThat(tables.has("customers") || tables.has("CUSTOMERS")).isTrue();
        assertThat(tables.has("INFORMATION_SCHEMA") || tables.has("constants") || tables.has("CONSTANTS")).isFalse();
    }

    @Test
    void download_withoutLogin_isUnauthorized() throws Exception {
        mockMvc.perform(post("/api/settings/backup/download"))
                .andExpect(status().isUnauthorized());
    }
}
