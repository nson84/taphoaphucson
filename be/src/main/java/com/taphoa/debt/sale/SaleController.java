package com.taphoa.debt.sale;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.taphoa.debt.common.PageResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/sales")
public class SaleController {

    private final SaleService saleService;

    public SaleController(SaleService saleService) {
        this.saleService = saleService;
    }

    @PostMapping
    public SaleDto checkout(@Valid @RequestBody CreateSaleRequest request) {
        return saleService.checkout(request);
    }

    @GetMapping("/report")
    public SaleReportDto report(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return saleService.report(from, to);
    }

    @GetMapping
    public PageResponse<SaleDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        LocalDateTime fromDt = from != null ? from.atStartOfDay() : null;
        LocalDateTime toDt = to != null ? to.plusDays(1).atStartOfDay() : null;
        return PageResponse.from(saleService.search(q, fromDt, toDt, page, size));
    }

    @GetMapping("/{id}")
    public SaleDto get(@PathVariable Long id) {
        return saleService.get(id);
    }

    @PostMapping("/{id}/cancel")
    public SaleDto cancel(@PathVariable Long id) {
        return saleService.cancel(id);
    }

    /** Hủy hóa đơn cũ và tạo hóa đơn mới (sửa từ lịch sử / về phiếu mua). */
    @PostMapping("/{id}/replace")
    public SaleDto replace(@PathVariable Long id, @Valid @RequestBody CreateSaleRequest request) {
        return saleService.replace(id, request);
    }
}
