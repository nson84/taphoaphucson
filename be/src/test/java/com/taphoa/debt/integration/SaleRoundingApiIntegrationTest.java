package com.taphoa.debt.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.sale.PaymentMethod;
import com.taphoa.debt.sale.SaleService;
import com.taphoa.debt.support.ApiTestSupport;

/**
 * Quy tắc làm tròn: tiền mặt và ghi nợ làm tròn tổng hóa đơn LÊN 1.000 đ (10.500 → 11.000);
 * chuyển khoản giữ nguyên 10.500.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SaleRoundingApiIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    private String token;

    @BeforeEach
    void setUp() throws Exception {
        token = ApiTestSupport.loginToken(mockMvc);
    }

    private long product(String barcode, int sellPrice) throws Exception {
        var res = mockMvc.perform(post("/api/products")
                        .header("Authorization", ApiTestSupport.bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"barcode":"%s","name":"Hàng %s","costPrice":1000,"sellPrice":%d,
                                 "stockQty":100,"unit":"Gói"}
                                """.formatted(barcode, barcode, sellPrice)))
                .andExpect(status().isOk())
                .andReturn();
        return ApiTestSupport.readId(res);
    }

    private ResultActions sale(long productId, int qty, String method, int paid, String extra) throws Exception {
        return mockMvc.perform(post("/api/sales")
                .header("Authorization", ApiTestSupport.bearer(token))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"items":[{"productId":%d,"qty":%d}],"paymentMethod":"%s","paidAmount":%d%s}
                        """.formatted(productId, qty, method, paid, extra)));
    }

    @Test
    void cash_10500_roundsUpTo11000() throws Exception {
        long p = product("8935000000011", 3500);
        sale(p, 3, "CASH", 11000, "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(11000))
                .andExpect(jsonPath("$.roundingAmount").value(500))
                .andExpect(jsonPath("$.paidAmount").value(11000))
                .andExpect(jsonPath("$.debtAmount").value(0));
    }

    @Test
    void cash_alreadyRound_noRounding() throws Exception {
        long p = product("8935000000028", 5000);
        sale(p, 2, "CASH", 10000, "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(10000))
                .andExpect(jsonPath("$.roundingAmount").value(0));
    }

    @Test
    void transfer_keeps10500() throws Exception {
        long p = product("8935000000035", 3500);
        sale(p, 3, "TRANSFER", 10500, "")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(10500))
                .andExpect(jsonPath("$.roundingAmount").value(0))
                .andExpect(jsonPath("$.paidAmount").value(10500));
    }

    @Test
    void debt_10500_roundsUpTo11000_likeCash() throws Exception {
        long p = product("8935000000042", 3500);
        sale(p, 3, "DEBT", 0, ",\"customerName\":\"Khách nợ làm tròn\"")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(11000))
                .andExpect(jsonPath("$.roundingAmount").value(500))
                .andExpect(jsonPath("$.debtAmount").value(11000));
    }

    @Test
    void discountThenRound_appliesToPayableAmount() throws Exception {
        long p = product("8935000000059", 4500);
        // 2 x 4.500 = 9.000, giảm 1.500 → 7.500 → làm tròn 8.000
        sale(p, 2, "CASH", 8000, ",\"discountAmount\":1500")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalAmount").value(8000))
                .andExpect(jsonPath("$.roundingAmount").value(500))
                .andExpect(jsonPath("$.discountAmount").value(1500));
    }

    @Test
    void roundingFor_rules() {
        BigDecimal v = new BigDecimal("10500.00");
        assertThat(SaleService.roundingFor(PaymentMethod.CASH, v)).isEqualByComparingTo("500");
        assertThat(SaleService.roundingFor(PaymentMethod.DEBT, v)).isEqualByComparingTo("500");
        assertThat(SaleService.roundingFor(PaymentMethod.MIXED, v)).isEqualByComparingTo("500");
        assertThat(SaleService.roundingFor(PaymentMethod.TRANSFER, v)).isEqualByComparingTo("0");
        assertThat(SaleService.roundingFor(PaymentMethod.CARD, v)).isEqualByComparingTo("0");
        assertThat(SaleService.roundingFor(PaymentMethod.CASH, new BigDecimal("10000"))).isEqualByComparingTo("0");
        assertThat(SaleService.roundingFor(PaymentMethod.CASH, new BigDecimal("10200"))).isEqualByComparingTo("800");
        assertThat(SaleService.roundingFor(PaymentMethod.CASH, BigDecimal.ZERO)).isEqualByComparingTo("0");
    }
}
