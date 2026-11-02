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

import com.fasterxml.jackson.databind.JsonNode;
import com.taphoa.debt.support.ApiTestSupport;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class DebtApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void createGetUpdateSearchPayUnpayDelete() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"Nguyễn Văn Test",
                                  "amount":50000,
                                  "productNote":"1 thùng mì",
                                  "occurredAt":"2026-10-20T09:30:00"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.customerName").value("Nguyễn Văn Test"))
                .andExpect(jsonPath("$.amount").value(50000))
                .andExpect(jsonPath("$.paid").value(false))
                .andReturn();

        long id = ApiTestSupport.MAPPER.readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(get("/api/debts/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productNote").value("1 thùng mì"));

        mockMvc.perform(get("/api/debts")
                        .param("q", "Nguyễn")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElements").value(1));

        mockMvc.perform(put("/api/debts/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"Nguyễn Văn Test",
                                  "amount":55000,
                                  "productNote":"1 thùng mì + trứng",
                                  "occurredAt":"2026-10-20T09:30:00"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.amount").value(55000));

        mockMvc.perform(post("/api/debts/{id}/pay", id)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paid").value(true));

        mockMvc.perform(put("/api/debts/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"Nguyễn Văn Test",
                                  "amount":55000,
                                  "occurredAt":"2026-10-20T09:30:00"
                                }
                                """))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/debts/{id}/unpay", id)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"pin":"000000"}
                                """))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/debts/{id}/unpay", id)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"pin":"123456"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paid").value(false));

        mockMvc.perform(delete("/api/debts/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/debts/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isNotFound());
    }

    @Test
    void payBatch_paysMultiple() throws Exception {
        long id1 = createDebt("Khách A", 10000);
        long id2 = createDebt("Khách B", 20000);

        mockMvc.perform(post("/api/debts/pay-batch")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"ids":[%d,%d]}
                                """.formatted(id1, id2)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paidCount").value(2));
    }

    @Test
    void validation_amountAndNameLimits() throws Exception {
        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"An",
                                  "amount":500,
                                  "occurredAt":"2026-10-20T09:30:00"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("1.000")));

        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"%s",
                                  "amount":1000,
                                  "occurredAt":"2026-10-20T09:30:00"
                                }
                                """.formatted("X".repeat(81))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("80")));

        mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"An",
                                  "amount":1001,
                                  "occurredAt":"2026-10-20T09:30:00"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("1,500")));
    }

    private long createDebt(String name, int amount) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/debts")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "debtType":"PERSONAL","pickerName":"Người lấy","customerName":"%s",
                                  "amount":%d,
                                  "occurredAt":"2026-10-21T08:00:00"
                                }
                                """.formatted(name, amount)))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode body = ApiTestSupport.MAPPER.readTree(result.getResponse().getContentAsString());
        return body.get("id").asLong();
    }
}
