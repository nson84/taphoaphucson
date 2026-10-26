package com.taphoa.debt.customer;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.debt.Debt;
import com.taphoa.debt.debt.DebtRepository;
import com.taphoa.debt.debt.DebtType;

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
        return findOrCreate(rawName, note, null);
    }

    /**
     * Cùng tên nhưng khác bố/mẹ = hai khách khác nhau.
     * Chỉ tái sử dụng khi trùng cả tên (đã chuẩn hóa) và tên bố/mẹ.
     */
    @Transactional
    public Customer findOrCreate(String rawName, String note, String parentName) {
        String name = CustomerNameNormalizer.normalize(rawName);
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Tên khách không được trống");
        }
        String parent = normalizeParent(parentName);

        List<Customer> sameName = customerRepository.findAllByNormalizedName(name);
        List<Customer> matches = sameName.stream()
                .filter(c -> parentKey(c.getParentName()).equals(parentKey(parent)))
                .toList();

        if (matches.isEmpty()) {
            Customer created = new Customer();
            created.setName(name);
            if (note != null) {
                created.setNote(note);
            }
            created.setParentName(parent);
            return customerRepository.save(created);
        }

        Customer primary = matches.get(0);
        if (!primary.getName().equals(name)) {
            primary.setName(name);
        }
        if (note != null && !note.isBlank()) {
            primary.setNote(note);
        }
        // Không ghi đè parentName bằng giá trị khác — đã khớp identity
        if (!Objects.equals(normalizeParent(primary.getParentName()), parent)) {
            primary.setParentName(parent);
        }
        primary = customerRepository.save(primary);

        if (matches.size() > 1) {
            mergeInto(primary, matches.subList(1, matches.size()));
        }
        return primary;
    }

    /**
     * Ghi nợ công ty: identity theo tên công ty (không tách theo chủ/NV).
     * parentName lưu vai trò hiển thị (Chủ công ty / Nhân viên công ty).
     */
    @Transactional
    public Customer findOrCreateCompany(String rawName, String roleParentName) {
        String name = CustomerNameNormalizer.normalize(rawName);
        if (name.isEmpty()) {
            throw new IllegalArgumentException("Tên công ty không được trống");
        }

        List<Customer> sameName = customerRepository.findAllByNormalizedName(name);
        Customer match = sameName.stream()
                .filter(c -> isEmptyOrCompanyRole(c.getParentName())
                        || debtRepository.existsByCustomerIdAndDebtType(c.getId(), DebtType.COMPANY))
                .findFirst()
                .orElse(null);

        if (match == null) {
            Customer created = new Customer();
            created.setName(name);
            created.setParentName(normalizeParent(roleParentName));
            return customerRepository.save(created);
        }

        return applyCompanyRole(match, roleParentName);
    }

    /** Cập nhật vai trò chủ/NV trên đúng hồ sơ công ty (dùng khi sửa khoản nợ). */
    @Transactional
    public Customer applyCompanyRole(Customer customer, String roleParentName) {
        String name = CustomerNameNormalizer.normalize(customer.getName());
        if (!customer.getName().equals(name)) {
            customer.setName(name);
        }
        customer.setParentName(normalizeParent(roleParentName));
        return customerRepository.save(customer);
    }

    public static boolean isEmptyOrCompanyRole(String parentName) {
        String key = parentKey(parentName);
        if (key.isEmpty()) {
            return true;
        }
        // Bỏ dấu ':' / khoảng trắng thừa; so khớp không phân biệt hoa thường (Locale ROOT + vi)
        String compact = key.replace(":", "").trim();
        return compact.equals("chủ công ty")
                || compact.startsWith("chủ công ty ")
                || compact.equals("nhân viên công ty")
                || compact.startsWith("nhân viên công ty ");
    }

    /**
     * Chỉ gộp khách trùng cả tên + bố/mẹ (không gộp hai người cùng tên khác bố).
     */
    @Transactional
    public void mergeDuplicates() {
        Map<String, List<Customer>> groups = new LinkedHashMap<>();
        for (Customer c : customerRepository.findAll()) {
            if (CustomerNameNormalizer.normalize(c.getName()).isEmpty()) {
                continue;
            }
            String key = identityKey(c.getName(), c.getParentName());
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
            log.info("Đã gộp {} khách hàng trùng tên + bố/mẹ", merged);
        }
    }

    private void mergeInto(Customer primary, List<Customer> duplicates) {
        for (Customer dup : duplicates) {
            if (dup.getId().equals(primary.getId())) {
                continue;
            }
            // An toàn: không gộp nếu bố/mẹ khác nhau
            if (!parentKey(primary.getParentName()).equals(parentKey(dup.getParentName()))) {
                log.warn(
                        "Bỏ qua gộp khách id={} và id={} — khác bố/mẹ",
                        primary.getId(),
                        dup.getId()
                );
                continue;
            }
            List<Debt> debts = debtRepository.findAllByCustomerId(dup.getId());
            for (Debt debt : debts) {
                debt.setCustomer(primary);
                debtRepository.save(debt);
            }
            boolean changed = false;
            if ((primary.getNote() == null || primary.getNote().isBlank())
                    && dup.getNote() != null
                    && !dup.getNote().isBlank()) {
                primary.setNote(dup.getNote());
                changed = true;
            }
            if (changed) {
                customerRepository.save(primary);
            }
            customerRepository.delete(dup);
        }
    }

    static String normalizeParent(String parentName) {
        String parent = CustomerNameNormalizer.normalize(parentName);
        return parent.isEmpty() ? null : parent;
    }

    static String parentKey(String parentName) {
        return CustomerNameNormalizer.normalize(parentName == null ? "" : parentName)
                .toLowerCase(Locale.ROOT);
    }

    static String identityKey(String name, String parentName) {
        String n = CustomerNameNormalizer.normalize(name).toLowerCase(Locale.ROOT);
        return n + "\0" + parentKey(parentName);
    }
}
