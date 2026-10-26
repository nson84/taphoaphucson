package com.taphoa.debt.qr;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings/bank-qr")
public class ShopQrConfigController {

    private final DebtQrService debtQrService;

    public ShopQrConfigController(DebtQrService debtQrService) {
        this.debtQrService = debtQrService;
    }

    @GetMapping
    public ShopQrConfigDto get() {
        return debtQrService.getConfig();
    }

    @PutMapping
    public ShopQrConfigDto update(@Valid @RequestBody ShopQrConfigRequest request) {
        return debtQrService.updateConfig(request);
    }
}
