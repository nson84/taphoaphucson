ALTER TABLE products ADD COLUMN sku VARCHAR(64) NULL;

UPDATE products SET sku = barcode WHERE sku IS NULL OR TRIM(sku) = '';

CREATE UNIQUE INDEX uk_products_sku ON products (sku);

CREATE TABLE product_barcodes (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    code VARCHAR(64) NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'BARCODE',
    CONSTRAINT uk_product_barcodes_code UNIQUE (code),
    CONSTRAINT fk_product_barcodes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_barcodes_product (product_id)
);

INSERT INTO product_barcodes (product_id, code, kind)
SELECT id, barcode, 'PRIMARY'
FROM products
WHERE barcode IS NOT NULL AND TRIM(barcode) <> '';

INSERT INTO product_barcodes (product_id, code, kind)
SELECT p.id, p.sku, 'SKU'
FROM products p
WHERE p.sku IS NOT NULL
  AND TRIM(p.sku) <> ''
  AND p.sku <> p.barcode
  AND NOT EXISTS (
      SELECT 1 FROM product_barcodes b WHERE b.code = p.sku
  );
