-- Tồn kho không được âm (các lần bán trước có thể đã trừ xuống -1, -2…)
UPDATE products SET stock_qty = 0 WHERE stock_qty < 0;
