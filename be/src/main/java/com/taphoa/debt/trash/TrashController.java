package com.taphoa.debt.trash;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.taphoa.debt.customer.CustomerService;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtService;
import com.taphoa.debt.summary.SummaryDto;

@RestController
@RequestMapping("/api/trash")
public class TrashController {

    public static final int RETENTION_DAYS = DebtService.TRASH_RETENTION_DAYS;

    private final DebtRepository debtRepository;
    private final CustomerService customerService;

    public TrashController(DebtRepository debtRepository, CustomerService customerService) {
        this.debtRepository = debtRepository;
        this.customerService = customerService;
    }

    @GetMapping
    public SummaryDto trash(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "amountDesc") String sort
    ) {
        LocalDateTime cutoff = LocalDateTime.now(DebtService.VN_ZONE).minusDays(RETENTION_DAYS);
        BigDecimal totalPaid = debtRepository.sumPaidInTrash(cutoff);
        var customersPage = customerService.searchTrash(q, page, size, sort, RETENTION_DAYS);
        return new SummaryDto(
                totalPaid,
                customersPage.getTotalElements(),
                customersPage.getContent(),
                customersPage.getNumber(),
                customersPage.getSize(),
                customersPage.getTotalPages()
        );
    }
}
