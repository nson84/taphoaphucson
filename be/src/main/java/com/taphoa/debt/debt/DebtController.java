package com.taphoa.debt.debt;

import java.math.BigDecimal;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.taphoa.debt.common.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/debts")
public class DebtController {

    private final DebtService debtService;

    public DebtController(DebtService debtService) {
        this.debtService = debtService;
    }

    @GetMapping
    public PageResponse<DebtDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) DebtType debtType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = AmountSort.DESC) String sort
    ) {
        return PageResponse.from(debtService.search(q, debtType, page, size, sort));
    }

    @GetMapping("/{id}")
    public DebtDto get(@PathVariable Long id) {
        return debtService.get(id);
    }

    @PostMapping
    public DebtDto create(@Valid @RequestBody CreateDebtRequest request) {
        return debtService.create(request);
    }

    @PutMapping("/{id}")
    public DebtDto update(@PathVariable Long id, @Valid @RequestBody UpdateDebtRequest request) {
        return debtService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        debtService.delete(id);
    }

    @PostMapping("/{id}/pay")
    public DebtDto pay(@PathVariable Long id, @RequestBody(required = false) PayRequest request) {
        BigDecimal amount = request == null ? null : request.amount();
        boolean cascade = request != null && Boolean.TRUE.equals(request.cascadeRemainder());
        return debtService.pay(id, amount, cascade);
    }

    @PostMapping("/pay-batch")
    public java.util.Map<String, Integer> payBatch(@Valid @RequestBody PayBatchRequest request) {
        int paid = debtService.markPaidBatch(request.ids());
        return java.util.Map.of("paidCount", paid);
    }

    @PostMapping("/{id}/unpay")
    public DebtDto unpay(@PathVariable Long id, @Valid @RequestBody UnpayRequest request) {
        return debtService.markUnpaid(id, request.pin());
    }
}
