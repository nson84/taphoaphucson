CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    barcode VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    cost_price DECIMAL(15, 2) NOT NULL,
    sell_price DECIMAL(15, 2) NOT NULL,
    stock_qty INT NOT NULL DEFAULT 0,
    unit VARCHAR(40) NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_products_barcode UNIQUE (barcode),
    INDEX idx_products_name (name),
    INDEX idx_products_active (active)
);

CREATE TABLE sales (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) NOT NULL,
    customer_id BIGINT NULL,
    payment_method VARCHAR(20) NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    discount_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15, 2) NOT NULL,
    debt_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    note TEXT NULL,
    occurred_at DATETIME NOT NULL,
    cancelled_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uk_sales_code UNIQUE (code),
    CONSTRAINT fk_sales_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    INDEX idx_sales_occurred_at (occurred_at),
    INDEX idx_sales_customer (customer_id)
);

CREATE TABLE sale_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    sale_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    barcode VARCHAR(64) NOT NULL,
    product_name VARCHAR(200) NOT NULL,
    qty INT NOT NULL,
    unit_price DECIMAL(15, 2) NOT NULL,
    cost_price DECIMAL(15, 2) NOT NULL,
    line_total DECIMAL(15, 2) NOT NULL,
    CONSTRAINT fk_sale_items_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    CONSTRAINT fk_sale_items_product FOREIGN KEY (product_id) REFERENCES products(id),
    INDEX idx_sale_items_sale (sale_id)
);

ALTER TABLE debts ADD COLUMN sale_id BIGINT NULL;
ALTER TABLE debts ADD CONSTRAINT fk_debts_sale FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE SET NULL;
CREATE INDEX idx_debts_sale ON debts (sale_id);
