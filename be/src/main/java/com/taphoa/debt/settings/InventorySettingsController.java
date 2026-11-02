package com.taphoa.debt.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/settings/inventory")
public class InventorySettingsController {

    private final InventorySettingsService inventorySettingsService;

    public InventorySettingsController(InventorySettingsService inventorySettingsService) {
        this.inventorySettingsService = inventorySettingsService;
    }

    @GetMapping
    public InventoryAlertDto get() {
        return inventorySettingsService.getAlert();
    }

    @PutMapping
    public InventoryAlertDto update(@Valid @RequestBody InventoryAlertRequest request) {
        return inventorySettingsService.update(request);
    }
}
