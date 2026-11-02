package com.taphoa.debt.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.taphoa.debt.product.BarcodeUtil;
import com.taphoa.debt.support.ApiTestSupport;

/** Thêm nhanh hàng không có mã vạch từ POS: tự cấp mã nội bộ EAN-13 hợp lệ. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class QuickProductApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    private JsonNode quick(String body) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/products/quick")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
        return ApiTestSupport.MAPPER.readTree(res.getResponse().getContentAsByteArray());
    }

    @Test
    void createsProductWithValidInternalEan13() throws Exception {
        JsonNode p = quick("{\"name\":\"Rau muống bó\",\"sellPrice\":7000}");
        String code = p.path("barcode").asText();
        assertThat(code).hasSize(13).startsWith("29");
        assertThat(BarcodeUtil.isValidGtin(code)).isTrue();
        assertThat(p.path("realBarcode").asBoolean()).isTrue();
        assertThat(p.path("hasPhysicalBarcode").asBoolean()).isFalse();
        assertThat(p.path("name").asText()).isEqualTo("Rau muống bó");
        assertThat(p.path("sellPrice").asInt()).isEqualTo(7000);
        assertThat(p.path("stockQty").asInt()).isZero();
        assertThat(p.path("unit").asText()).isEqualTo("Cái");
        assertThat(p.path("active").asBoolean()).isTrue();
    }

    @Test
    void usesGivenUnitAndCost_andCodesAreUnique() throws Exception {
        JsonNode a = quick("{\"name\":\"Hành lá\",\"sellPrice\":3500,\"costPrice\":2000,\"unit\":\"Bó\"}");
        JsonNode b = quick("{\"name\":\"Hành tím\",\"sellPrice\":3500}");
        assertThat(a.path("unit").asText()).isEqualTo("Bó");
        assertThat(a.path("costPrice").asInt()).isEqualTo(2000);
        assertThat(a.path("hasPhysicalBarcode").asBoolean()).isFalse();
        assertThat(a.path("barcode").asText()).isNotEqualTo(b.path("barcode").asText());
        long sa = Long.parseLong(a.path("barcode").asText().substring(2, 12));
        long sb = Long.parseLong(b.path("barcode").asText().substring(2, 12));
        assertThat(sb).isEqualTo(sa + 1);

        mockMvc.perform(post("/api/products/quick")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Hành lá\",\"sellPrice\":4000}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void validation_nameAndPriceRequired() throws Exception {
        mockMvc.perform(post("/api/products/quick")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"  \",\"sellPrice\":1000}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/products/quick")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\"}"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/products/quick")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"sellPrice\":-1}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void survivesFakeCodeCleanup() throws Exception {
        JsonNode p = quick("{\"name\":\"Không mã vạch\",\"sellPrice\":5000}");
        long id = p.path("id").asLong();
        mockMvc.perform(post("/api/products/fake-codes/delete")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"123456\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/products/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());
    }

    @Test
    void requiresAuth() throws Exception {
        mockMvc.perform(post("/api/products/quick")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"X\",\"sellPrice\":1}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void ean13CheckDigit_matchesKnownCode() {
        assertThat(BarcodeUtil.ean13FromPrefix12("400638133393")).isEqualTo("4006381333931");
    }
}
