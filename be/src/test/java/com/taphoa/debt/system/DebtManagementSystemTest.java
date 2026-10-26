package com.taphoa.debt.system;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.debt.DebtRepository;

/**
 * System test: chạy full HTTP stack (RANDOM_PORT), luồng nghiệp vụ sổ nợ.
 * Không cover phần bán thẻ cào.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestRestTemplate
@ActiveProfiles("test")
class DebtManagementSystemTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate restTemplate;
    @Autowired
    private DebtRepository debtRepository;
    @Autowired
    private CustomerRepository customerRepository;

    private String baseUrl;
    private String token;

    @BeforeEach
    void setUp() {
        debtRepository.deleteAll();
        customerRepository.deleteAll();
        baseUrl = "http://localhost:" + port;
        token = login();
    }

    @Test
    void endToEnd_debtLifecycleAndSummary() {
        // 1. Tạo 2 khoản nợ cho cùng khách (tên có khoảng trắng thừa)
        Map<String, Object> debt1 = createDebt("  Minh  ", 15000, "2026-06-01T09:00:00", "mì");
        Map<String, Object> debt2 = createDebt("Minh", 25000, "2026-06-10T09:00:00", "gạo");
        assertThat(debt1.get("customerId")).isEqualTo(debt2.get("customerId"));

        Number customerId = (Number) debt1.get("customerId");
        Number debt1Id = (Number) debt1.get("id");
        Number debt2Id = (Number) debt2.get("id");

        // 2. Khách chỉ còn 1 bản ghi, balance = 40_000
        ResponseEntity<Map> customer = exchange(
                HttpMethod.GET,
                "/api/customers/" + customerId.longValue(),
                null,
                Map.class
        );
        assertThat(customer.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(new BigDecimal(customer.getBody().get("balance").toString()))
                .isEqualByComparingTo("40000");

        // 3. Lọc nợ theo tháng 6/2026
        ResponseEntity<Map> debtsInJune = exchange(
                HttpMethod.GET,
                "/api/customers/" + customerId.longValue() + "/debts?year=2026&month=6",
                null,
                Map.class
        );
        assertThat(debtsInJune.getBody().get("totalElements")).isEqualTo(2);

        // 4. Trả 1 khoản → summary giảm
        exchange(HttpMethod.POST, "/api/debts/" + debt1Id.longValue() + "/pay", null, Map.class);

        ResponseEntity<Map> summaryAfterPay = exchange(HttpMethod.GET, "/api/summary", null, Map.class);
        assertThat(summaryAfterPay.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(new BigDecimal(summaryAfterPay.getBody().get("totalUnpaid").toString()))
                .isEqualByComparingTo("25000");

        // 5. Pay-batch khoản còn lại
        ResponseEntity<Map> batch = exchange(
                HttpMethod.POST,
                "/api/debts/pay-batch",
                Map.of("ids", List.of(debt2Id.longValue())),
                Map.class
        );
        assertThat(batch.getBody().get("paidCount")).isEqualTo(1);

        ResponseEntity<Map> summaryCleared = exchange(HttpMethod.GET, "/api/summary", null, Map.class);
        assertThat(new BigDecimal(summaryCleared.getBody().get("totalUnpaid").toString()))
                .isEqualByComparingTo("0");

        // 6. Unpay bằng PIN đúng → nợ mở lại
        ResponseEntity<Map> unpaid = exchange(
                HttpMethod.POST,
                "/api/debts/" + debt2Id.longValue() + "/unpay",
                Map.of("pin", "123456"),
                Map.class
        );
        assertThat(unpaid.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(unpaid.getBody().get("paid")).isEqualTo(false);

        // 7. Validate hệ thống từ chối số tiền quá nhỏ
        ResponseEntity<Map> invalid = exchange(
                HttpMethod.POST,
                "/api/debts",
                Map.of(
                        "debtType", "PERSONAL",
                        "customerName", "Minh",
                        "pickerName", "Người lấy",
                        "amount", 100,
                        "occurredAt", "2026-06-11T09:00:00"
                ),
                Map.class
        );
        assertThat(invalid.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    private String login() {
        ResponseEntity<Map> response = restTemplate.postForEntity(
                baseUrl + "/api/auth/login",
                Map.of("username", "admin", "password", "admin123"),
                Map.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return (String) response.getBody().get("token");
    }

    private Map<String, Object> createDebt(String name, int amount, String occurredAt, String productNote) {
        ResponseEntity<Map> response = exchange(
                HttpMethod.POST,
                "/api/debts",
                Map.of(
                        "debtType", "PERSONAL",
                        "customerName", name,
                        "pickerName", "Người lấy",
                        "amount", amount,
                        "occurredAt", occurredAt,
                        "productNote", productNote
                ),
                Map.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        return response.getBody();
    }

    private <T> ResponseEntity<T> exchange(HttpMethod method, String path, Object body, Class<T> type) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<?> entity = body == null ? new HttpEntity<>(headers) : new HttpEntity<>(body, headers);
        return restTemplate.exchange(baseUrl + path, method, entity, type);
    }
}
