package com.taphoa.debt.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProductSaleApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    @Test
    void updateProduct_sameBarcode_andChangeCategory_succeeds() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"8850228000106",
                                  "name":"Bò Húc chai",
                                  "category":"Khác",
                                  "costPrice":10000,
                                  "sellPrice":12000,
                                  "stockQty":9,
                                  "unit":"Cái",
                                  "units":[{"name":"Cái","factor":1,"sellPrice":12000,"costPrice":10000,"base":true}]
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();
        long id = ApiTestSupport.readId(created);

        mockMvc.perform(put("/api/products/{id}", id)
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"8850228000106",
                                  "name":"Bò Húc chai",
                                  "category":"Nước giải khát",
                                  "costPrice":10000,
                                  "sellPrice":12000,
                                  "stockQty":9,
                                  "unit":"Cái",
                                  "units":[{"name":"Cái","factor":1,"sellPrice":12000,"costPrice":10000,"base":true}],
                                  "active":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.category").value("Nước giải khát"))
                .andExpect(jsonPath("$.barcode").value("8850228000106"));
    }

    @Test
    void deleteFakeCodes_requiresPin_andKeepsRealBarcodes() throws Exception {
        for (String body : new String[] {
                """
                {"barcode":"SP999001","name":"Hàng mã ảo","costPrice":0,"sellPrice":1000,"stockQty":0,"unit":"Cái"}
                """,
                """
                {"barcode":"3017620422003","sku":"SP999002","name":"Nutella","costPrice":0,"sellPrice":1000,"stockQty":0,"unit":"Hộp"}
                """
        }) {
            mockMvc.perform(post("/api/products")
                            .header("Authorization", ApiTestSupport.bearer(token))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(body))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(post("/api/products/fake-codes/delete")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"000000\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/products/fake-codes/delete")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"pin\":\"123456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deleted").value(1))
                .andExpect(jsonPath("$.deactivated").value(0))
                .andExpect(jsonPath("$.stripped").value(1));

        mockMvc.perform(get("/api/products/by-barcode/{code}", "SP999001")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/products/by-barcode/{code}", "SP999002")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/products/by-barcode/{code}", "3017620422003")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("3017620422003"))
                .andExpect(jsonPath("$.barcodes.length()").value(1));
    }

    @Test
    void productWithUnits_checkoutByPackAndCase() throws Exception {
        MvcResult created = mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"8931234567890",
                                  "name":"Bánh Nabati",
                                  "category":"Thực phẩm",
                                  "costPrice":5000,
                                  "sellPrice":7000,
                                  "stockQty":30,
                                  "unit":"Gói",
                                  "units":[
                                    {"name":"Gói","factor":1,"sellPrice":7000,"costPrice":5000,"base":true},
                                    {"name":"Thùng","factor":24,"sellPrice":150000,"costPrice":120000,"base":false}
                                  ],
                                  "active":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.barcode").value("8931234567890"))
                .andExpect(jsonPath("$.stockQty").value(30))
                .andExpect(jsonPath("$.units.length()").value(2))
                .andReturn();

        long productId = ApiTestSupport.readId(created);
        long thungId = ApiTestSupport.MAPPER.readTree(created.getResponse().getContentAsString())
                .get("units").get(1).get("id").asLong();

        mockMvc.perform(get("/api/products/by-barcode/{code}", "8931234567890")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Bánh Nabati"))
                .andExpect(jsonPath("$.units.length()").value(2));

        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"8930000111222",
                                  "sku":"SP-ALIAS-1",
                                  "name":"Nước suối",
                                  "costPrice":3000,
                                  "sellPrice":5000,
                                  "stockQty":10,
                                  "unit":"Chai",
                                  "extraBarcodes":["8999000111222"],
                                  "active":true
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sku").value("SP-ALIAS-1"));

        mockMvc.perform(get("/api/products/by-barcode/{code}", "SP-ALIAS-1")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Nước suối"));

        mockMvc.perform(get("/api/products/by-barcode/{code}", "8999000111222")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.barcode").value("8930000111222"));

        MvcResult salePack = mockMvc.perform(post("/api/sales")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items":[{"productId":%d,"qty":2,"unitPrice":6500}],
                                  "paymentMethod":"CASH",
                                  "paidAmount":13000,
                                  "discountAmount":0
                                }
                                """.formatted(productId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(13000))
                .andExpect(jsonPath("$.items[0].unitFactor").value(1))
                .andReturn();

        long salePackId = ApiTestSupport.readId(salePack);

        mockMvc.perform(get("/api/products/{id}", productId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQty").value(28));

        mockMvc.perform(post("/api/sales")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "items":[{"productId":%d,"qty":1,"productUnitId":%d}],
                                  "paymentMethod":"CASH",
                                  "paidAmount":150000,
                                  "discountAmount":0
                                }
                                """.formatted(productId, thungId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(150000))
                .andExpect(jsonPath("$.items[0].unitName").value("Thùng"))
                .andExpect(jsonPath("$.items[0].unitFactor").value(24));

        mockMvc.perform(get("/api/products/{id}", productId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQty").value(4));

        mockMvc.perform(post("/api/sales/{id}/cancel", salePackId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cancelledAt").isNotEmpty());

        mockMvc.perform(get("/api/products/{id}", productId)
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.stockQty").value(6));
    }

    @Test
    void search_noCost_filtersProductsWithoutCostPrice() throws Exception {
        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"NCOST001",
                                  "name":"Hàng chưa vốn",
                                  "costPrice":0,
                                  "sellPrice":5000,
                                  "stockQty":1,
                                  "unit":"Cái"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"NCOST002",
                                  "name":"Hàng có vốn",
                                  "costPrice":3000,
                                  "sellPrice":5000,
                                  "stockQty":1,
                                  "unit":"Cái"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/products")
                        .param("q", "NCOST")
                        .param("codeType", "noCost")
                        .param("page", "0")
                        .param("size", "50")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].barcode").value("NCOST001"));

        mockMvc.perform(get("/api/products/code-stats")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.noCost").isNumber());
    }

    @Test
    void search_barname_filtersProductsWhoseNameIsABarcode() throws Exception {
        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"NAMEBC01",
                                  "name":"8934563215057",
                                  "costPrice":1000,
                                  "sellPrice":2000,
                                  "stockQty":1,
                                  "unit":"Cái"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "barcode":"NAMEBC02",
                                  "name":"Sữa tươi Milo",
                                  "costPrice":1000,
                                  "sellPrice":2000,
                                  "stockQty":1,
                                  "unit":"Cái"
                                }
                                """))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/products")
                        .param("q", "NAMEBC")
                        .param("codeType", "barname")
                        .param("page", "0")
                        .param("size", "50")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content.length()").value(1))
                .andExpect(jsonPath("$.content[0].barcode").value("NAMEBC01"))
                .andExpect(jsonPath("$.content[0].name").value("8934563215057"));

        mockMvc.perform(get("/api/products/code-stats")
                        .header("Authorization", ApiTestSupport.bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.barcodeName").isNumber());
    }
}
