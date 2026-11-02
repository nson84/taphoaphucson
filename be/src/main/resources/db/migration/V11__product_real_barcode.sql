ALTER TABLE products ADD COLUMN real_barcode BOOLEAN NULL;

CREATE INDEX idx_products_real_barcode ON products (real_barcode);
