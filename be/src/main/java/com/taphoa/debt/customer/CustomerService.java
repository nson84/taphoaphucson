package com.taphoa.debt.customer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.debt.DebtDto;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtService;
import com.taphoa.debt.debt.DebtType;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final DebtRepository debtRepository;
    private final DebtService debtService;
    private final CustomerMergeService customerMergeService;

    public CustomerService(
            CustomerRepository customerRepository,
            DebtRepository debtRepository,
            DebtService debtService,
            CustomerMergeService customerMergeService
    ) {
        this.customerRepository = customerRepository;
        this.debtRepository = debtRepository;
        this.debtService = debtService;
        this.customerMergeService = customerMergeService;
    }

    @Transactional(readOnly = true)
    public Page<CustomerDto> search(String q, int page, int size) {
        return search(q, page, size, com.taphoa.debt.debt.AmountSort.DESC);
    }

    @Transactional(readOnly = true)
    public Page<CustomerDto> search(String q, int page, int size, String sort) {
        return search(q, page, size, sort, false);
    }

    /**
     * @param nameOnly true = chỉ khớp tên khách/công ty (dùng gợi ý form ghi nợ).
     *                 false = thêm khớp quan hệ/xưởng (Tổng hợp / danh sách).
     * @param suggest  true = gợi ý form tạo nợ: gồm cả khách hết nợ / chưa có nợ (không chỉ còn dư).
     */
    @Transactional(readOnly = true)
    public Page<CustomerDto> search(String q, int page, int size, String sort, boolean nameOnly) {
        return search(q, page, size, sort, nameOnly, false, false, false);
    }

    @Transactional(readOnly = true)
    public Page<CustomerDto> search(
            String q,
            int page,
            int size,
            String sort,
            boolean nameOnly,
            boolean filterPersonal,
            boolean filterCompany
    ) {
        return search(q, page, size, sort, nameOnly, filterPersonal, filterCompany, false);
    }

    @Transactional(readOnly = true)
    public Page<CustomerDto> search(
            String q,
            int page,
            int size,
            String sort,
            boolean nameOnly,
            boolean filterPersonal,
            boolean filterCompany,
            boolean suggest
    ) {
        String nq = normalize(q);
        PageRequest pageable = PageRequest.of(page, size);
        if (suggest) {
            // Luôn hiện số còn nợ (0 đ nếu đã trả xong) — không dùng tổng đã trả như Thùng rác
            return customerRepository
                    .suggestByName(nq, filterPersonal, filterCompany, pageable)
                    .map(this::toSuggestDto);
        }
        var pageResult = com.taphoa.debt.debt.AmountSort.isDescending(sort)
                ? customerRepository.searchByNameOrderByBalanceDesc(
                        nq, nameOnly, filterPersonal, filterCompany, pageable)
                : customerRepository.searchByNameOrderByBalanceAsc(
                        nq, nameOnly, filterPersonal, filterCompany, pageable);
        return pageResult.map(this::toDto);
    }

    /**
     * Khách có khoản đã trả còn trong hạn. Khách vẫn còn nợ khác vẫn hiện ở đây (phần đã trả)
     * và vẫn ở Tổng hợp (phần còn nợ).
     */
    @Transactional(readOnly = true)
    public Page<CustomerDto> searchTrash(String q, int page, int size, String sort, int retentionDays) {
        String nq = normalize(q);
        PageRequest pageable = PageRequest.of(page, size);
        LocalDateTime cutoff = trashCutoff(retentionDays);
        var pageResult = com.taphoa.debt.debt.AmountSort.isDescending(sort)
                ? customerRepository.searchTrashOrderByPaidDesc(nq, cutoff, pageable)
                : customerRepository.searchTrashOrderByPaidAsc(nq, cutoff, pageable);
        return pageResult.map(c -> toTrashDto(c, cutoff));
    }

    @Transactional(readOnly = true)
    public CustomerDto get(Long id) {
        return get(id, false);
    }

    /**
     * @param trashView true = balance là tổng đã trả còn trong hạn thùng rác
     */
    @Transactional(readOnly = true)
    public CustomerDto get(Long id, boolean trashView) {
        Customer customer = find(id);
        if (trashView) {
            return toTrashDto(customer, trashCutoff(DebtService.TRASH_RETENTION_DAYS));
        }
        return toDto(customer);
    }

    @Transactional
    public CustomerDto create(CustomerRequest request) {
        return toDto(customerMergeService.findOrCreate(request.name(), request.note(), request.parentName()));
    }

    @Transactional
    public CustomerDto update(Long id, CustomerRequest request) {
        Customer customer = find(id);
        String name = CustomerNameNormalizer.normalize(request.name());
        customer.setName(name);
        customer.setNote(request.note());
        if (request.parentName() != null) {
            String parent = request.parentName().trim();
            customer.setParentName(parent.isEmpty() ? null : parent);
        }
        customer = customerRepository.save(customer);
        customerMergeService.mergeDuplicates();
        return toDto(customerRepository.findById(customer.getId()).orElse(customer));
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = find(id);
        debtRepository.findAllByCustomerId(id).forEach(debtRepository::delete);
        customerRepository.delete(customer);
    }

    @Transactional(readOnly = true)
    public Page<DebtDto> debts(
            Long customerId,
            Integer year,
            Integer month,
            Integer day,
            int page,
            int size,
            String sort,
            Boolean paid
    ) {
        return debtService.listByCustomer(customerId, year, month, day, page, size, sort, paid);
    }

    @Transactional
    public void payAmount(Long customerId, BigDecimal amount) {
        find(customerId);
        debtService.payAmountForCustomer(customerId, amount);
    }

    private Customer find(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy khách hàng", HttpStatus.NOT_FOUND));
    }

    private CustomerDto toDto(Customer customer) {
        boolean trashed = customer.getTrashedAt() != null;
        BigDecimal balance = trashed
                ? debtRepository.sumPaidByCustomer(customer.getId())
                : debtRepository.sumUnpaidByCustomer(customer.getId());
        boolean company = debtRepository.existsByCustomerIdAndDebtType(customer.getId(), DebtType.COMPANY);
        return new CustomerDto(
                customer.getId(),
                customer.getName(),
                customer.getParentName(),
                company,
                customer.getNote(),
                balance,
                customer.getCreatedAt(),
                customer.getUpdatedAt(),
                trashed
        );
    }

    /** Gợi ý form/ô tìm: balance = còn nợ (0 nếu hết nợ / trong thùng rác). */
    private CustomerDto toSuggestDto(Customer customer) {
        boolean company = debtRepository.existsByCustomerIdAndDebtType(customer.getId(), DebtType.COMPANY);
        return new CustomerDto(
                customer.getId(),
                customer.getName(),
                customer.getParentName(),
                company,
                customer.getNote(),
                debtRepository.sumUnpaidByCustomer(customer.getId()),
                customer.getCreatedAt(),
                customer.getUpdatedAt(),
                customer.getTrashedAt() != null
        );
    }

    /** Trong thùng rác: cột số tiền là tổng đã trả còn trong hạn, kể cả khách vẫn còn nợ khác. */
    private CustomerDto toTrashDto(Customer customer, LocalDateTime cutoff) {
        boolean company = debtRepository.existsByCustomerIdAndDebtType(customer.getId(), DebtType.COMPANY);
        return new CustomerDto(
                customer.getId(),
                customer.getName(),
                customer.getParentName(),
                company,
                customer.getNote(),
                debtRepository.sumPaidByCustomerSince(customer.getId(), cutoff),
                customer.getCreatedAt(),
                customer.getUpdatedAt(),
                customer.getTrashedAt() != null
        );
    }

    private static LocalDateTime trashCutoff(int retentionDays) {
        return LocalDateTime.now(DebtService.VN_ZONE).minusDays(retentionDays);
    }

    private String normalize(String q) {
        return q == null ? "" : q.trim();
    }
}
