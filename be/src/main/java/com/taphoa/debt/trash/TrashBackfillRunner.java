package com.taphoa.debt.trash;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.debt.DebtService;

/**
 * Đồng bộ trạng thái thùng rác khi khởi động (hữu ích khi local tắt Flyway).
 */
@Component
@Order(100)
public class TrashBackfillRunner implements ApplicationRunner {

    private final CustomerRepository customerRepository;
    private final DebtService debtService;

    public TrashBackfillRunner(CustomerRepository customerRepository, DebtService debtService) {
        this.customerRepository = customerRepository;
        this.debtService = debtService;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        customerRepository.findAll().forEach(c -> debtService.syncCustomerTrashState(c.getId()));
    }
}
