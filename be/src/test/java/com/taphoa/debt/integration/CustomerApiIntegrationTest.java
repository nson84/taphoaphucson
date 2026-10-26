package com.taphoa.debt.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
class CustomerApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void createGetUpdateSearchAndFilterDebts() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/customers")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Trần Bình","note":"khách quen"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Trần Bình"))
                .andExpect(jsonPath("$.note").value("khách quen"))
                .andReturn();

        long customerId = ApiTestSupport.MAPPER.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"Trần Bình",
                                  "amount":12000,
                                  "occurredAt":"2026-03-15T10:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"Trần Bình",
                                  "amount":8000,
                                  "occurredAt":"2025-12-01T10:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/customers/{id}", customerId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance").value(20000));

        mockMvc.perform(get("/api/customers")
                        .param("q", "bình")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(get("/api/customers/{id}/debts", customerId)
                        .param("year", "2026")
                        .param("month", "3")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].amount").value(12000));

        mockMvc.perform(put("/api/customers/{id}", customerId)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Trần Bình","note":"đã cập nhật"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.note").value("đã cập nhật"));

        mockMvc.perform(delete("/api/customers/{id}", customerId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/customers/{id}", customerId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void sameName_mergesIntoOneCustomer() throws Exception {
        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"  Sơn  ",
                                  "amount":1000,
                                  "occurredAt":"2026-01-01T08:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"Sơn",
                                  "amount":2000,
                                  "occurredAt":"2026-01-02T08:00:00"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/customers")
                        .param("q", "Sơn")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1))
                .andExpect(jsonPath("$.content[0].balance").value(3000));
    }
}
