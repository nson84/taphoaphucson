package com.taphoa.debt.integration;

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

import com.taphoa.debt.support.ApiTestSupport;

/** Cảnh báo sớm trùng mã vạch + chặn tạo hàng trùng mã. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProductBarcodeCheckApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    private MvcResult createProduct(String barcode) throws Exception {
        return mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"barcode":"%s","name":"Hàng %s","costPrice":3000,"sellPrice":5000,
                                 "stockQty":1,"unit":"Gói"}
                                """.formatted(barcode, barcode)))
                .andReturn();
    }

    @Test
    void check_existingBarcode_returnsProduct_newBarcode_returnsNone() throws Exception {
        MvcResult created = createProduct("8934111111111");
        long id = ApiTestSupport.readId(created);

        mockMvc.perform(get("/api/products/barcode-check")
                        .param("code", " 8934111111111 ")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(true))
                .andExpect(jsonPath("$.productId").value(id))
                .andExpect(jsonPath("$.name").value("Hàng 8934111111111"));

        mockMvc.perform(get("/api/products/barcode-check")
                        .param("code", "8934999999999")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(false));
    }

    @Test
    void check_excludesProductBeingEdited() throws Exception {
        long id = ApiTestSupport.readId(createProduct("8934222222222"));

        mockMvc.perform(get("/api/products/barcode-check")
                        .param("code", "8934222222222")
                        .param("excludeId", String.valueOf(id))
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists").value(false));
    }

    @Test
    void create_duplicateBarcode_isRejected() throws Exception {
        createProduct("8934333333333");
        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"barcode":"8934333333333","name":"Trùng","costPrice":1,"sellPrice":500,
                                 "stockQty":1,"unit":"Gói"}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void check_requiresAuth() throws Exception {
        mockMvc.perform(get("/api/products/barcode-check").param("code", "1"))
                .andExpect(status().isUnauthorized());
    }
}
