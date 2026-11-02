package com.taphoa.debt.settings;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.product.ProductRepository;

@Service
public class InventorySettingsService {

    static final String KEY_ENABLED = "low_stock_alert_enabled";
    static final String KEY_THRESHOLD = "low_stock_threshold";

    private final ShopSettingRepository settingRepository;
    private final ProductRepository productRepository;

    public InventorySettingsService(ShopSettingRepository settingRepository, ProductRepository productRepository) {
        this.settingRepository = settingRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public InventoryAlertDto getAlert() {
        boolean enabled = Boolean.parseBoolean(get(KEY_ENABLED, "true"));
        int threshold = parseThreshold(get(KEY_THRESHOLD, "10"));
        long count = enabled
                ? productRepository.countLowStock(threshold)
                : 0L;
        return new InventoryAlertDto(enabled, threshold, count);
    }

    @Transactional
    public InventoryAlertDto update(InventoryAlertRequest request) {
        save(KEY_ENABLED, Boolean.TRUE.equals(request.enabled()) ? "true" : "false");
        save(KEY_THRESHOLD, String.valueOf(request.threshold()));
        return getAlert();
    }

    private String get(String key, String fallback) {
        return settingRepository.findById(key).map(ShopSetting::getValue).orElse(fallback);
    }

    private void save(String key, String value) {
        settingRepository.save(new ShopSetting(key, value));
    }

    private static int parseThreshold(String raw) {
        try {
            int n = Integer.parseInt(raw.trim());
            return Math.max(1, Math.min(9999, n));
        } catch (NumberFormatException ex) {
            return 10;
        }
    }
}
