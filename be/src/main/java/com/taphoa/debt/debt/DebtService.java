package com.taphoa.debt.debt;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.auth.PinService;
import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.customer.CustomerMergeService;
import com.taphoa.debt.customer.CustomerRepository;

@Service
public class DebtService {

    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final DebtRepository debtRepository;
    private final CustomerRepository customerRepository;
    private final CustomerMergeService customerMergeService;
    private final PinService pinService;

    public DebtService(
            DebtRepository debtRepository,
            CustomerRepository customerRepository,
            CustomerMergeService customerMergeService,
            PinService pinService
    ) {
        this.debtRepository = debtRepository;
        this.customerRepository = customerRepository;
        this.customerMergeService = customerMergeService;
        this.pinService = pinService;
    }

    @Transactional(readOnly = true)
    public Page<DebtDto> search(String q, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return debtRepository.searchAll(normalize(q), pageable).map(DebtMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Page<DebtDto> listByCustomer(
            Long customerId,
            Integer year,
            Integer month,
            Integer day,
            int page,
            int size
    ) {
        if (!customerRepository.existsById(customerId)) {
            throw new ApiException("Không tìm thấy khách hàng", HttpStatus.NOT_FOUND);
        }
        validateDateFilter(year, month, day);
        LocalDateTime from = null;
        LocalDateTime to = null;
        if (year != null) {
            if (month != null && day != null) {
                LocalDate date = LocalDate.of(year, month, day);
                from = date.atStartOfDay();
                to = date.plusDays(1).atStartOfDay();
            } else if (month != null) {
                YearMonth ym = YearMonth.of(year, month);
                from = ym.atDay(1).atStartOfDay();
                to = ym.plusMonths(1).atDay(1).atStartOfDay();
            } else {
                from = LocalDate.of(year, 1, 1).atStartOfDay();
                to = LocalDate.of(year + 1, 1, 1).atStartOfDay();
            }
        }
        Pageable pageable = PageRequest.of(page, size);
        return debtRepository.findByCustomerAndRange(customerId, from, to, pageable).map(DebtMapper::toDto);
    }

    @Transactional(readOnly = true)
    public DebtDto get(Long id) {
        return DebtMapper.toDto(findDebt(id));
    }

    @Transactional
    public DebtDto create(CreateDebtRequest request) {
        // Ghi chú chỉ gắn vào lần nợ, không ghi đè ghi chú khách
        Customer customer = customerMergeService.findOrCreate(request.customerName(), null);

        Debt debt = new Debt();
        debt.setCustomer(customer);
        debt.setAmount(request.amount());
        debt.setProductNote(request.productNote());
        debt.setCustomerNote(request.customerNote());
        debt.setOccurredAt(request.occurredAt() != null ? request.occurredAt() : LocalDateTime.now(VN_ZONE));
        debt.setPaid(false);
        return DebtMapper.toDto(debtRepository.save(debt));
    }

    @Transactional
    public DebtDto update(Long id, UpdateDebtRequest request) {
        Debt debt = findDebt(id);
        if (debt.isPaid()) {
            throw new ApiException("Không thể sửa khoản nợ đã trả", HttpStatus.BAD_REQUEST);
        }
        Customer customer = customerMergeService.findOrCreate(request.customerName(), null);

        debt.setCustomer(customer);
        debt.setAmount(request.amount());
        debt.setProductNote(request.productNote());
        debt.setCustomerNote(request.customerNote());
        debt.setOccurredAt(request.occurredAt());
        return DebtMapper.toDto(debtRepository.save(debt));
    }

    @Transactional
    public void delete(Long id) {
        Debt debt = findDebt(id);
        debtRepository.delete(debt);
    }

    @Transactional
    public DebtDto markPaid(Long id) {
        Debt debt = findDebt(id);
        if (debt.isPaid()) {
            throw new ApiException("Khoản nợ đã được trả", HttpStatus.BAD_REQUEST);
        }
        debt.setPaid(true);
        debt.setPaidAt(LocalDateTime.now(VN_ZONE));
        return DebtMapper.toDto(debtRepository.save(debt));
    }

    @Transactional
    public int markPaidBatch(java.util.List<Long> ids) {
        int count = 0;
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        for (Long id : ids) {
            Debt debt = findDebt(id);
            if (debt.isPaid()) {
                continue;
            }
            debt.setPaid(true);
            debt.setPaidAt(now);
            debtRepository.save(debt);
            count++;
        }
        return count;
    }

    @Transactional
    public DebtDto markUnpaid(Long id, String pin) {
        pinService.verifyCurrentUserPin(pin);
        Debt debt = findDebt(id);
        if (!debt.isPaid()) {
            throw new ApiException("Khoản nợ đang ở trạng thái còn nợ", HttpStatus.BAD_REQUEST);
        }
        debt.setPaid(false);
        debt.setPaidAt(null);
        return DebtMapper.toDto(debtRepository.save(debt));
    }

    private Debt findDebt(Long id) {
        return debtRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy khoản nợ", HttpStatus.NOT_FOUND));
    }

    private void validateDateFilter(Integer year, Integer month, Integer day) {
        int currentYear = LocalDate.now(VN_ZONE).getYear();
        if (year != null && (year < 2000 || year > currentYear + 1)) {
            throw new ApiException("Năm không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        if (month != null && (month < 1 || month > 12)) {
            throw new ApiException("Tháng phải từ 1 đến 12", HttpStatus.BAD_REQUEST);
        }
        if (day != null && (day < 1 || day > 31)) {
            throw new ApiException("Ngày phải từ 1 đến 31", HttpStatus.BAD_REQUEST);
        }
        if (day != null && (year == null || month == null)) {
            throw new ApiException("Lọc theo ngày cần đủ năm và tháng", HttpStatus.BAD_REQUEST);
        }
        if (month != null && year == null) {
            throw new ApiException("Lọc theo tháng cần có năm", HttpStatus.BAD_REQUEST);
        }
        if (year != null && month != null && day != null) {
            try {
                LocalDate.of(year, month, day);
            } catch (Exception ex) {
                throw new ApiException("Ngày không tồn tại", HttpStatus.BAD_REQUEST);
            }
        }
    }

    private String normalize(String q) {
        return q == null ? "" : q.trim();
    }
}
