package com.taphoa.debt.customer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.debt.Debt;
import com.taphoa.debt.debt.DebtRepository;

@Component
public class CustomerMergeService implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(CustomerMergeService.class);

    private final CustomerRepository customerRepository;
    private final DebtRepository debtRepository;

    public CustomerMergeService(CustomerRepository customerRepository, DebtRepository debtRepository) {
        this.customerRepository = customerRepository;
        this.debtRepository = debtRepository;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        mergeDuplicates();
    }

    @Transactional
    public Customer findOrCreate(String rawName, String note) {
        String name = CustomerNameNormalizer.normalize(rawName);
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Tên khách không được trống");
        }

        List<Customer> matches = customerRepository.findAllByNormalizedName(name);
        Customer primary;
        if (matches.isEmpty()) {
            primary = new Customer();
            primary.setName(name);
            if (note != null) {
                primary.setNote(note);
            }
            return customerRepository.save(primary);
        }

        primary = matches.get(0);
        if (!primary.getName().equals(name)) {
            primary.setName(name);
        }
        if (note != null && !note.isBlank()) {
            primary.setNote(note);
        }
        primary = customerRepository.save(primary);

        if (matches.size() > 1) {
            mergeInto(primary, matches.subList(1, matches.size()));
        }
        return primary;
    }

    @Transactional
    public void mergeDuplicates() {
        Map<String, List<Customer>> groups = new LinkedHashMap<>();
        for (Customer c : customerRepository.findAll()) {
            String key = CustomerNameNormalizer.normalize(c.getName()).toLowerCase(Locale.ROOT);
            if (key.isEmpty()) {
                continue;
            }
            groups.computeIfAbsent(key, k -> new ArrayList<>()).add(c);
        }

        int merged = 0;
        for (List<Customer> group : groups.values()) {
            if (group.size() < 2) {
                continue;
            }
            group.sort((a, b) -> Long.compare(a.getId(), b.getId()));
            Customer primary = group.get(0);
            mergeInto(primary, group.subList(1, group.size()));
            merged += group.size() - 1;
        }
        if (merged > 0) {
            log.info("Đã gộp {} khách hàng trùng tên", merged);
        }
    }

    private void mergeInto(Customer primary, List<Customer> duplicates) {
        for (Customer dup : duplicates) {
            if (dup.getId().equals(primary.getId())) {
                continue;
            }
            List<Debt> debts = debtRepository.findAllByCustomerId(dup.getId());
            for (Debt debt : debts) {
                debt.setCustomer(primary);
                debtRepository.save(debt);
            }
            if ((primary.getNote() == null || primary.getNote().isBlank())
                    && dup.getNote() != null
                    && !dup.getNote().isBlank()) {
                primary.setNote(dup.getNote());
                customerRepository.save(primary);
            }
            customerRepository.delete(dup);
        }
    }
}
