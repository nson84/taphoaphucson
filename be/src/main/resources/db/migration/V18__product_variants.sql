-- Biến thể kiểu dáng / màu sắc của cùng một hàng (chung tên, nhóm; ảnh riêng; giá tuỳ chọn)
CREATE TABLE product_variants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id BIGINT NOT NULL,
    name VARCHAR(80) NOT NULL,
    image_filename VARCHAR(128) NULL,
    sell_price DECIMAL(15, 2) NULL,
    cost_price DECIMAL(15, 2) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_variants_product (product_id)
);

-- Snapshot tên kiểu trên dòng hóa đơn (không FK — biến thể có thể bị xóa sau)
ALTER TABLE sale_items
    ADD COLUMN variant_name VARCHAR(80) NULL AFTER product_name;
