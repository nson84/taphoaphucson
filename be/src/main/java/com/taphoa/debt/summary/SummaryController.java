package com.taphoa.debt.summary;

import java.math.BigDecimal;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.taphoa.debt.customer.CustomerService;
import com.taphoa.debt.debt.DebtRepository;

@RestController
@RequestMapping("/api/summary")
public class SummaryController {

    private final DebtRepository debtRepository;
    private final CustomerService customerService;

    public SummaryController(DebtRepository debtRepository, CustomerService customerService) {
        this.debtRepository = debtRepository;
        this.customerService = customerService;
    }

    @GetMapping
    public SummaryDto summary(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        BigDecimal total = debtRepository.sumAllUnpaid();
        var customersPage = customerService.search(q, page, size);
        return new SummaryDto(
                total,
                customersPage.getTotalElements(),
                customersPage.getContent(),
                customersPage.getNumber(),
                customersPage.getSize(),
                customersPage.getTotalPages()
        );
    }
}
