package com.taphoa.debt.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
class SellPriceStepApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void createProduct_rejectsNonStepSellPrice() throws Exception {
        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"barcode":"8937000000001","name":"Giá lệch","costPrice":1000,"sellPrice":7001,
                                 "stockQty":1,"unit":"Gói"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void createWithoutBarcode_setsFlagAndInternalCode() throws Exception {
        MvcResult res = mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Rau cải","category":"Khác","costPrice":2000,"sellPrice":7000,
                                 "stockQty":0,"unit":"Bó"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode p = ApiTestSupport.MAPPER.readTree(res.getResponse().getContentAsByteArray());
        assertThat(p.path("hasPhysicalBarcode").asBoolean()).isFalse();
        assertThat(p.path("barcode").asText()).startsWith("29").hasSize(13);
    }

    @Test
    void checkout_rejectsUnitPriceNotMultipleOf500() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"barcode":"8937000000002","name":"Hàng OK","costPrice":1000,"sellPrice":7000,
                                 "stockQty":10,"unit":"Gói"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        long id = ApiTestSupport.readId(created);
        mockMvc.perform(post("/api/sales")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[{"productId":%d,"qty":1,"unitPrice":7001}],
                                 "paymentMethod":"CASH","paidAmount":8000,"discountAmount":0}
                                """.formatted(id)))
                .andExpect(status().isBadRequest());
    }
}
