-- Làm tròn tổng hóa đơn lên 1.000 đ khi thanh toán tiền mặt / ghi nợ (không còn tiền lẻ 500 đ).
-- total_amount = tiền hàng - giảm giá + rounding_amount. Hóa đơn cũ: 0.
ALTER TABLE sales ADD COLUMN rounding_amount DECIMAL(15, 2) NOT NULL DEFAULT 0;
