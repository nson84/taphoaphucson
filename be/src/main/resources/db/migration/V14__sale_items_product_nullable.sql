-- Cho phép xóa hẳn hàng mã ảo đã từng bán; dòng hóa đơn giữ barcode + product_name.
ALTER TABLE sale_items DROP FOREIGN KEY fk_sale_items_product;
ALTER TABLE sale_items MODIFY product_id BIGINT NULL;
ALTER TABLE sale_items
    ADD CONSTRAINT fk_sale_items_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
