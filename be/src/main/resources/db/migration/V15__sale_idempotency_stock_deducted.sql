-- Chống tạo trùng hóa đơn khi client gửi lại (mất mạng / bấm 2 lần): NULL = không dùng khóa.
ALTER TABLE sales ADD COLUMN client_request_id VARCHAR(64) NULL;
ALTER TABLE sales ADD CONSTRAINT uk_sales_client_request UNIQUE (client_request_id);

-- Số lượng tồn (đơn vị cơ bản) thực sự đã trừ khi bán; hủy hóa đơn hoàn đúng số này.
-- NULL = hóa đơn cũ (trước V15): hoàn qty * unit_factor như trước.
ALTER TABLE sale_items ADD COLUMN stock_deducted INT NULL;
