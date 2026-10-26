package com.taphoa.debt.trash;

import java.time.LocalDateTime;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtService;

/**
 * Quá 60 ngày trong thùng rác: chỉ xóa các khoản nợ, giữ lại thông tin khách hàng.
 */
@Component
public class TrashCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(TrashCleanupJob.class);

    private final CustomerRepository customerRepository;
    private final DebtRepository debtRepository;

    public TrashCleanupJob(CustomerRepository customerRepository, DebtRepository debtRepository) {
        this.customerRepository = customerRepository;
        this.debtRepository = debtRepository;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void purgeExpiredTrash() {
        LocalDateTime cutoff = LocalDateTime.now(DebtService.VN_ZONE).minusDays(TrashController.RETENTION_DAYS);
        List<Customer> expired = customerRepository.findByTrashedAtBefore(cutoff);
        if (expired.isEmpty()) {
            return;
        }
        int customers = 0;
        int debtsRemoved = 0;
        for (Customer customer : expired) {
            var debts = debtRepository.findAllByCustomerId(customer.getId());
            debtsRemoved += debts.size();
            debts.forEach(debtRepository::delete);
            customer.setTrashedAt(null);
            customerRepository.save(customer);
            customers++;
        }
        log.info(
                "Đã dọn thùng rác: xóa {} khoản nợ của {} khách (giữ hồ sơ khách), cutoff={}",
                debtsRemoved,
                customers,
                cutoff
        );
    }
}
