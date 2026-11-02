-- Reset tồn kho về 0 (cửa hàng tự nhập lại khi cần). Bán hàng vẫn cho phép tồn âm.
UPDATE products SET stock_qty = 0;

CREATE TABLE shop_settings (
    setting_key VARCHAR(64) NOT NULL,
    setting_value VARCHAR(255) NOT NULL,
    PRIMARY KEY (setting_key)
);

INSERT INTO shop_settings (setting_key, setting_value) VALUES
    ('low_stock_alert_enabled', 'true'),
    ('low_stock_threshold', '10');
