CREATE TABLE shop_qr_config (
    id BIGINT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT FALSE,
    bank_bin VARCHAR(20) NOT NULL DEFAULT '',
    account_no VARCHAR(40) NOT NULL DEFAULT '',
    account_name VARCHAR(80) NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL
);

INSERT INTO shop_qr_config (id, enabled, bank_bin, account_no, account_name, updated_at)
VALUES (1, FALSE, '970436', '', '', CURRENT_TIMESTAMP);

CREATE TABLE debt_qr_payments (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    code VARCHAR(16) NOT NULL,
    transfer_content VARCHAR(100) NOT NULL,
    qr_image_url VARCHAR(500) NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    CONSTRAINT uk_debt_qr_code UNIQUE (code),
    CONSTRAINT fk_debt_qr_customer FOREIGN KEY (customer_id) REFERENCES customers (id)
);

CREATE INDEX idx_debt_qr_customer_status ON debt_qr_payments (customer_id, status);
