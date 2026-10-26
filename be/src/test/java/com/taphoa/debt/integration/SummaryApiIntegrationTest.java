package com.taphoa.debt.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.support.ApiTestSupport;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SummaryApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void summary_totalsUnpaidOnly() throws Exception {
        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"A",
                                  "amount":10000,
                                  "occurredAt":"2026-05-01T10:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        MvcResult paidDebt = mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"B",
                                  "amount":7000,
                                  "occurredAt":"2026-05-02T10:00:00"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();
        long paidId = ApiTestSupport.MAPPER.readTree(paidDebt.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/debts/{id}/pay", paidId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/summary")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUnpaid").value(10000))
                .andExpect(jsonPath("$.customerCount").value(1));

        mockMvc.perform(get("/api/trash")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUnpaid").value(7000))
                .andExpect(jsonPath("$.customerCount").value(1))
                .andExpect(jsonPath("$.customers[0].name").value("B"));
    }
}
