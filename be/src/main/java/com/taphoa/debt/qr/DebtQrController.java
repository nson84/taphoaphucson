package com.taphoa.debt.qr;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api")
public class DebtQrController {

    private final DebtQrService debtQrService;

    public DebtQrController(DebtQrService debtQrService) {
        this.debtQrService = debtQrService;
    }

    @PostMapping("/customers/{customerId}/debt-qr")
    public DebtQrDto create(
            @PathVariable Long customerId,
            @Valid @RequestBody CreateDebtQrRequest request
    ) {
        return debtQrService.createForCustomer(customerId, request.amount());
    }

    @PostMapping("/debt-qr/{id}/mark-used")
    public DebtQrDto markUsed(@PathVariable Long id) {
        return debtQrService.markUsed(id);
    }
}
