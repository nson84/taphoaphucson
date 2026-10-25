package com.taphoa.debt.customer;

import java.math.BigDecimal;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.debt.DebtDto;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtService;

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
        return customerRepository.searchByName(normalize(q), PageRequest.of(page, size))
                .map(this::toDto);
    }

    @Transactional(readOnly = true)
    public CustomerDto get(Long id) {
        return toDto(find(id));
    }

    @Transactional
    public CustomerDto create(CustomerRequest request) {
        return toDto(customerMergeService.findOrCreate(request.name(), request.note()));
    }

    @Transactional
    public CustomerDto update(Long id, CustomerRequest request) {
        Customer customer = find(id);
        String name = CustomerNameNormalizer.normalize(request.name());
        customer.setName(name);
        customer.setNote(request.note());
        customer = customerRepository.save(customer);
        customerMergeService.mergeDuplicates();
        return toDto(customerRepository.findById(customer.getId()).orElse(customer));
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = find(id);
        debtRepository.findByCustomerAndRange(id, null, null, PageRequest.of(0, Integer.MAX_VALUE))
                .forEach(debtRepository::delete);
        customerRepository.delete(customer);
    }

    @Transactional(readOnly = true)
    public Page<DebtDto> debts(
            Long customerId,
            Integer year,
            Integer month,
            Integer day,
            int page,
            int size
    ) {
        return debtService.listByCustomer(customerId, year, month, day, page, size);
    }

    private Customer find(Long id) {
        return customerRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy khách hàng", HttpStatus.NOT_FOUND));
    }

    private CustomerDto toDto(Customer customer) {
        BigDecimal balance = debtRepository.sumUnpaidByCustomer(customer.getId());
        return new CustomerDto(
                customer.getId(),
                customer.getName(),
                customer.getNote(),
                balance,
                customer.getCreatedAt(),
                customer.getUpdatedAt()
        );
    }

    private String normalize(String q) {
        return q == null ? "" : q.trim();
    }
}
