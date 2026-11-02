package com.taphoa.debt.customer;

import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.taphoa.debt.common.PageResponse;
import com.taphoa.debt.debt.DebtDto;
import com.taphoa.debt.debt.PayAmountRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @GetMapping
    public PageResponse<CustomerDto> search(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "amountDesc") String sort,
            @RequestParam(defaultValue = "false") boolean nameOnly,
            @RequestParam(defaultValue = "false") boolean filterPersonal,
            @RequestParam(defaultValue = "false") boolean filterCompany,
            /** true = gợi ý form tạo nợ (gồm khách hết nợ / chưa nợ); false = danh sách còn dư nợ */
            @RequestParam(defaultValue = "false") boolean suggest
    ) {
        return PageResponse.from(
                customerService.search(q, page, size, sort, nameOnly, filterPersonal, filterCompany, suggest));
    }

    @GetMapping("/{id}")
    public CustomerDto get(
            @PathVariable Long id,
            /** true = số dư là tổng đã trả trong thùng rác (kể cả khách vẫn còn nợ) */
            @RequestParam(defaultValue = "false") boolean trashView
    ) {
        return customerService.get(id, trashView);
    }

    @GetMapping("/{id}/debts")
    public PageResponse<DebtDto> debts(
            @PathVariable Long id,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer day,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "dateDesc") String sort,
            /** null = tất cả; false = còn nợ (Tổng hợp); true = hết nợ (Thùng rác) */
            @RequestParam(required = false) Boolean paid
    ) {
        return PageResponse.from(customerService.debts(id, year, month, day, page, size, sort, paid));
    }

    @PostMapping("/{id}/pay-amount")
    public void payAmount(@PathVariable Long id, @Valid @RequestBody PayAmountRequest request) {
        customerService.payAmount(id, request.amount());
    }

    @PostMapping
    public CustomerDto create(@Valid @RequestBody CustomerRequest request) {
        return customerService.create(request);
    }

    @PutMapping("/{id}")
    public CustomerDto update(@PathVariable Long id, @Valid @RequestBody CustomerRequest request) {
        return customerService.update(id, request);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        customerService.delete(id);
    }
}
