package com.taphoa.debt.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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

/**
 * Hồi quy các lỗi nghiệp vụ POS tìm thấy khi rà soát hệ thống:
 * hoàn tồn khi hủy đơn bán vượt tồn, chống tạo trùng hóa đơn, đơn vị tính cũ, toàn vẹn nợ gắn hóa đơn.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SaleIntegrityApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void cancelOversoldSale_restoresOnlyStockThatWasDeducted() throws Exception {
        long productId = createProduct("8934000000011", 2);

        MvcResult sale = postSale("""
                {"items":[{"productId":%d,"qty":5}],"paymentMethod":"CASH","paidAmount":25000}
                """.formatted(productId));
        assertThat(stockOf(productId)).isZero();

        mockMvc.perform(post("/api/sales/{id}/cancel", ApiTestSupport.readId(sale))
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());

        assertThat(stockOf(productId)).isEqualTo(2);
    }

    @Test
    void cancelNormalSale_restoresFullQuantity() throws Exception {
        long productId = createProduct("8934000000028", 10);

        MvcResult sale = postSale("""
                {"items":[{"productId":%d,"qty":3}],"paymentMethod":"CASH","paidAmount":15000}
                """.formatted(productId));
        assertThat(stockOf(productId)).isEqualTo(7);

        mockMvc.perform(post("/api/sales/{id}/cancel", ApiTestSupport.readId(sale))
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());

        assertThat(stockOf(productId)).isEqualTo(10);
    }

    @Test
    void resendWithSameClientRequestId_returnsSameSale_andDeductsStockOnce() throws Exception {
        long productId = createProduct("8934000000035", 10);
        String body = """
                {"items":[{"productId":%d,"qty":2}],"paymentMethod":"CASH","paidAmount":10000,
                 "clientRequestId":"req-resend-1"}
                """.formatted(productId);

        long first = ApiTestSupport.readId(postSale(body));
        long second = ApiTestSupport.readId(postSale(body));

        assertThat(second).isEqualTo(first);
        assertThat(stockOf(productId)).isEqualTo(8);
    }

    @Test
    void differentClientRequestIds_createSeparateSales() throws Exception {
        long productId = createProduct("8934000000042", 10);
        String template = """
                {"items":[{"productId":%d,"qty":1}],"paymentMethod":"CASH","paidAmount":5000,
                 "clientRequestId":"%s"}
                """;

        long first = ApiTestSupport.readId(postSale(template.formatted(productId, "req-a")));
        long second = ApiTestSupport.readId(postSale(template.formatted(productId, "req-b")));

        assertThat(second).isNotEqualTo(first);
        assertThat(stockOf(productId)).isEqualTo(8);
    }

    @Test
    void sellWithStaleProductUnitId_isRejected_andStockUnchanged() throws Exception {
        long productId = createProduct("8934000000059", 10);

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"items":[{"productId":%d,"qty":1,"productUnitId":999999,"unitPrice":150000}],
                                 "paymentMethod":"CASH","paidAmount":150000}
                                """.formatted(productId)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Đơn vị tính")));

        assertThat(stockOf(productId)).isEqualTo(10);
    }

    @Test
    void deleteDebtLinkedToSale_isRejected_andSaleKeepsItsDebt() throws Exception {
        long productId = createProduct("8934000000066", 10);
        MvcResult sale = postSale(debtSaleBody(productId));
        JsonNode saleJson = ApiTestSupport.MAPPER.readTree(sale.getResponse().getContentAsString());
        long debtId = saleJson.get("debtId").asLong();

        mockMvc.perform(delete("/api/debts/{id}", debtId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/sales/{id}", saleJson.get("id").asLong())
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.debtId").value(debtId));
    }

    @Test
    void cancelSale_whenDebtPartiallyPaid_isRejected_andStockUnchanged() throws Exception {
        long productId = createProduct("8934000000073", 10);
        MvcResult sale = postSale(debtSaleBody(productId));
        JsonNode saleJson = ApiTestSupport.MAPPER.readTree(sale.getResponse().getContentAsString());
        long customerId = saleJson.get("customerId").asLong();
        assertThat(stockOf(productId)).isEqualTo(8);

        mockMvc.perform(post("/api/customers/{id}/pay-amount", customerId)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":3000}"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/sales/{id}/cancel", saleJson.get("id").asLong())
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("trả một phần")));

        assertThat(stockOf(productId)).isEqualTo(8);
    }

    @Test
    void cancelSale_whenDebtUntouched_removesDebtAndRestoresStock() throws Exception {
        long productId = createProduct("8934000000080", 10);
        MvcResult sale = postSale(debtSaleBody(productId));
        JsonNode saleJson = ApiTestSupport.MAPPER.readTree(sale.getResponse().getContentAsString());

        mockMvc.perform(post("/api/sales/{id}/cancel", saleJson.get("id").asLong())
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk());

        assertThat(stockOf(productId)).isEqualTo(10);
        mockMvc.perform(get("/api/debts/{id}", saleJson.get("debtId").asLong())
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isNotFound());
    }

    private static String debtSaleBody(long productId) {
        return """
                {"items":[{"productId":%d,"qty":2,"unitPrice":5000}],"paymentMethod":"DEBT","paidAmount":0,
                 "customerName":"Chị Lan","debtType":"PERSONAL"}
                """.formatted(productId);
    }

    private MvcResult postSale(String json) throws Exception {
        return mockMvc.perform(post("/api/sales")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isOk())
                .andReturn();
    }

    private long createProduct(String barcode, int stock) throws Exception {
        MvcResult created = mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"barcode":"%s","name":"Hàng test %s","costPrice":3000,"sellPrice":5000,
                                 "stockQty":%d,"unit":"Gói"}
                                """.formatted(barcode, barcode, stock)))
                .andExpect(status().isOk())
                .andReturn();
        return ApiTestSupport.readId(created);
    }

    private int stockOf(long productId) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/products/{id}", productId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andReturn();
        return ApiTestSupport.MAPPER.readTree(result.getResponse().getContentAsString())
                .get("stockQty").asInt();
    }
}
