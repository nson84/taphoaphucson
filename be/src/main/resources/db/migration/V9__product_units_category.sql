ALTER TABLE products ADD COLUMN category VARCHAR(80) NULL;

CREATE TABLE product_units (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name VARCHAR(40) NOT NULL,
    factor INT NOT NULL DEFAULT 1,
    sell_price DECIMAL(15, 2) NOT NULL,
    cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    is_base BOOLEAN NOT NULL DEFAULT FALSE,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_units_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_units_product (product_id)
);

INSERT INTO product_units (product_id, name, factor, sell_price, cost_price, is_base, sort_order)
SELECT
    id,
    COALESCE(NULLIF(TRIM(unit), ''), 'Cái'),
    1,
    sell_price,
    cost_price,
    TRUE,
    0
FROM products;

ALTER TABLE sale_items ADD COLUMN unit_name VARCHAR(40) NULL;
ALTER TABLE sale_items ADD COLUMN unit_factor INT NOT NULL DEFAULT 1;
ALTER TABLE sale_items ADD COLUMN product_unit_id BIGINT NULL;
