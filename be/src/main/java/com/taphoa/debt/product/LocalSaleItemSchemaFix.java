package com.taphoa.debt.product;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * H2 local (ddl-auto=update) không luôn DROP NOT NULL trên cột cũ.
 * Đảm bảo sale_items.product_id nullable để xóa hẳn mã ảo đã từng bán.
 */
@Component
@Profile("local")
@Order(20)
public class LocalSaleItemSchemaFix implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(LocalSaleItemSchemaFix.class);

    private final JdbcTemplate jdbc;

    public LocalSaleItemSchemaFix(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            jdbc.execute("ALTER TABLE sale_items ALTER COLUMN product_id SET NULL");
            log.info("sale_items.product_id is nullable (local H2)");
        } catch (Exception e) {
            log.debug("sale_items.product_id nullable fix skipped: {}", e.getMessage());
        }
    }
}
