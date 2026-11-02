package com.taphoa.debt.migration;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

/**
 * Chạy toàn bộ migration Flyway trên MySQL thật rồi để Hibernate {@code validate} schema khớp entity.
 *
 * <p>Test thường (H2, {@code flyway.enabled=false}) KHÔNG phát hiện được migration hỏng hoặc entity lệch
 * migration — lỗi đó chỉ nổ khi app khởi động trên máy cửa hàng. H2 cũng không chạy được cú pháp MySQL
 * (ví dụ {@code ADD COLUMN ... AFTER}), nên cần MySQL thật.
 *
 * <p>Chỉ chạy khi đặt biến môi trường (trỏ tới một schema RỖNG dùng cho thử nghiệm, KHÔNG phải {@code tap_hoa}):
 * <pre>
 * TAPHOA_TEST_MYSQL_URL=jdbc:mysql://localhost:3306/taphoa_migration_test?createDatabaseIfNotExist=true&amp;useSSL=false&amp;allowPublicKeyRetrieval=true
 * TAPHOA_TEST_MYSQL_USER=...   TAPHOA_TEST_MYSQL_PASSWORD=...
 * </pre>
 */
@SpringBootTest
@ActiveProfiles("test")
@EnabledIfEnvironmentVariable(named = "TAPHOA_TEST_MYSQL_URL", matches = ".+")
class FlywayMysqlMigrationTest {

    @DynamicPropertySource
    static void mysqlProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", () -> System.getenv("TAPHOA_TEST_MYSQL_URL"));
        registry.add("spring.datasource.username",
                () -> System.getenv().getOrDefault("TAPHOA_TEST_MYSQL_USER", "root"));
        registry.add("spring.datasource.password",
                () -> System.getenv().getOrDefault("TAPHOA_TEST_MYSQL_PASSWORD", ""));
        registry.add("spring.datasource.driver-class-name", () -> "com.mysql.cj.jdbc.Driver");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
    }

    @Autowired
    private JdbcTemplate jdbc;

    @Test
    void allMigrationsApplyOnMysql_andSchemaMatchesEntities() {
        // Nếu tới được đây thì context đã khởi động: Flyway migrate xong và Hibernate validate không lỗi.
        Integer failed = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 0", Integer.class);
        Integer applied = jdbc.queryForObject(
                "SELECT COUNT(*) FROM flyway_schema_history WHERE success = 1 AND version IS NOT NULL",
                Integer.class);

        assertThat(failed).isZero();
        assertThat(applied).isGreaterThanOrEqualTo(15);
    }
}
