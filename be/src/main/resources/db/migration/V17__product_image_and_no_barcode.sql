-- Ảnh sản phẩm (file trên đĩa dưới TAPHOA_DATA_DIR/product-images) + cờ hàng không có mã vạch vật lý
ALTER TABLE products
    ADD COLUMN image_filename VARCHAR(128) NULL AFTER real_barcode;

ALTER TABLE products
    ADD COLUMN has_physical_barcode BOOLEAN NOT NULL DEFAULT TRUE AFTER image_filename;

-- Hàng đã tạo bằng quick (EAN-13 đầu số nội bộ 29) = không có mã vạch vật lý
UPDATE products
SET has_physical_barcode = FALSE
WHERE barcode LIKE '29%' AND CHAR_LENGTH(barcode) = 13;
