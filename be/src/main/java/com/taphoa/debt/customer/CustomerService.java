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
     */
    @Transactional(readOnly = true)
    public Page<CustomerDto> search(String q, int page, int size, String sort, boolean nameOnly) {
        return search(q, page, size, sort, nameOnly, false, false);
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
        String nq = normalize(q);
        PageRequest pageable = PageRequest.of(page, size);
        var pageResult = com.taphoa.debt.debt.AmountSort.isDescending(sort)
                ? customerRepository.searchByNameOrderByBalanceDesc(
                        nq, nameOnly, filterPersonal, filterCompany, pageable)
                : customerRepository.searchByNameOrderByBalanceAsc(
                        nq, nameOnly, filterPersonal, filterCompany, pageable);
        return pageResult.map(this::toDto);
    }

    /** Khách hết nợ trong thùng rác (còn trong hạn retentionDays). */
    @Transactional(readOnly = true)
    public Page<CustomerDto> searchTrash(String q, int page, int size, String sort, int retentionDays) {
        String nq = normalize(q);
        PageRequest pageable = PageRequest.of(page, size);
        LocalDateTime cutoff = LocalDateTime.now(DebtService.VN_ZONE).minusDays(retentionDays);
        var pageResult = com.taphoa.debt.debt.AmountSort.isDescending(sort)
                ? customerRepository.searchTrashOrderByPaidDesc(nq, cutoff, pageable)
                : customerRepository.searchTrashOrderByPaidAsc(nq, cutoff, pageable);
        return pageResult.map(this::toTrashDto);
    }

    @Transactional(readOnly = true)
    public CustomerDto get(Long id) {
        return toDto(find(id));
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
            String sort
    ) {
        return debtService.listByCustomer(customerId, year, month, day, page, size, sort);
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

    /** Trong thùng rác: cột số tiền hiển thị tổng đã trả. */
    private CustomerDto toTrashDto(Customer customer) {
        boolean company = debtRepository.existsByCustomerIdAndDebtType(customer.getId(), DebtType.COMPANY);
        return new CustomerDto(
                customer.getId(),
                customer.getName(),
                customer.getParentName(),
                company,
                customer.getNote(),
                debtRepository.sumPaidByCustomer(customer.getId()),
                customer.getCreatedAt(),
                customer.getUpdatedAt(),
                true
        );
    }

    private String normalize(String q) {
        return q == null ? "" : q.trim();
    }
}
