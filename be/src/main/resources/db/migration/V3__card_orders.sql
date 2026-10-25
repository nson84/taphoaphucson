CREATE TABLE card_products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    telco VARCHAR(50) NOT NULL,
    denomination INT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_card_products_telco_denom (telco, denomination)
);

CREATE TABLE card_orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    reference_number VARCHAR(30) NOT NULL,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    vtc_trans_ref VARCHAR(100) NULL,
    vtc_message VARCHAR(255) NULL,
    payment_type VARCHAR(50) NULL,
    paid_at DATETIME NULL,
    delivered_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_card_orders_ref UNIQUE (reference_number),
    CONSTRAINT fk_card_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_card_orders_product FOREIGN KEY (product_id) REFERENCES card_products(id),
    INDEX idx_card_orders_user (user_id),
    INDEX idx_card_orders_status (status)
);

CREATE TABLE card_codes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    serial_enc TEXT NOT NULL,
    code_enc TEXT NOT NULL,
    delivered_at DATETIME NOT NULL,
    CONSTRAINT fk_card_codes_order FOREIGN KEY (order_id) REFERENCES card_orders(id) ON DELETE CASCADE,
    INDEX idx_card_codes_order (order_id)
);

INSERT INTO card_products (telco, denomination, price, active) VALUES
('VIETTEL', 10000, 10000, TRUE),
('VIETTEL', 20000, 20000, TRUE),
('VIETTEL', 50000, 50000, TRUE),
('VIETTEL', 100000, 100000, TRUE),
('MOBIFONE', 10000, 10000, TRUE),
('MOBIFONE', 20000, 20000, TRUE),
('MOBIFONE', 50000, 50000, TRUE),
('MOBIFONE', 100000, 100000, TRUE),
('VINAPHONE', 10000, 10000, TRUE),
('VINAPHONE', 20000, 20000, TRUE),
('VINAPHONE', 50000, 50000, TRUE),
('VINAPHONE', 100000, 100000, TRUE);
