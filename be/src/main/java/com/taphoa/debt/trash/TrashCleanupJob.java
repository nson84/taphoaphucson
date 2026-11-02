package com.taphoa.debt.trash;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.debt.Debt;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtService;

/**
 * Quá 60 ngày: chỉ xóa các khoản đã trả. Khoản còn nợ và hồ sơ khách được giữ.
 */
@Component
public class TrashCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(TrashCleanupJob.class);

    private final DebtRepository debtRepository;
    private final DebtService debtService;

    public TrashCleanupJob(DebtRepository debtRepository, DebtService debtService) {
        this.debtRepository = debtRepository;
        this.debtService = debtService;
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void purgeExpiredTrash() {
        LocalDateTime cutoff = LocalDateTime.now(DebtService.VN_ZONE).minusDays(TrashController.RETENTION_DAYS);
        List<Debt> expired = debtRepository.findByPaidTrueAndPaidAtBefore(cutoff);
        if (expired.isEmpty()) {
            return;
        }
        Set<Long> customerIds = new LinkedHashSet<>();
        for (Debt debt : expired) {
            customerIds.add(debt.getCustomer().getId());
            debtRepository.delete(debt);
        }
        debtRepository.flush();
        customerIds.forEach(debtService::syncCustomerTrashState);
        log.info(
                "Đã dọn thùng rác: xóa {} khoản đã trả của {} khách (giữ khoản còn nợ và hồ sơ khách), cutoff={}",
                expired.size(),
                customerIds.size(),
                cutoff
        );
    }
}
