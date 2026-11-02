package com.taphoa.debt.debt;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.auth.PinService;
import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.common.MoneyRules;
import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.customer.CustomerMergeService;
import com.taphoa.debt.customer.CustomerNameNormalizer;
import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.qr.DebtQrService;

@Service
public class DebtService {

    public static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Số ngày giữ khoản đã trả trong thùng rác trước khi xóa phiếu. */
    public static final int TRASH_RETENTION_DAYS = 60;

    private static final DateTimeFormatter PARTIAL_NOTE_TIME =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

    private final DebtRepository debtRepository;
    private final CustomerRepository customerRepository;
    private final CustomerMergeService customerMergeService;
    private final PinService pinService;
    private final DebtQrService debtQrService;

    public DebtService(
            DebtRepository debtRepository,
            CustomerRepository customerRepository,
            CustomerMergeService customerMergeService,
            PinService pinService,
            DebtQrService debtQrService
    ) {
        this.debtRepository = debtRepository;
        this.customerRepository = customerRepository;
        this.customerMergeService = customerMergeService;
        this.pinService = pinService;
        this.debtQrService = debtQrService;
    }

    @Transactional(readOnly = true)
    public Page<DebtDto> search(String q, DebtType debtType, int page, int size, String sort) {
        return debtRepository.searchAll(normalize(q), debtType, AmountSort.debtPageable(page, size, sort))
                .map(DebtMapper::toDto);
    }

    @Transactional(readOnly = true)
    public Page<DebtDto> listByCustomer(
            Long customerId,
            Integer year,
            Integer month,
            Integer day,
            int page,
            int size,
            String sort
    ) {
        return listByCustomer(customerId, year, month, day, page, size, sort, null);
    }

    /**
     * @param paid null = tất cả; false = còn nợ (Tổng hợp); true = hết nợ (Thùng rác)
     */
    @Transactional(readOnly = true)
    public Page<DebtDto> listByCustomer(
            Long customerId,
            Integer year,
            Integer month,
            Integer day,
            int page,
            int size,
            String sort,
            Boolean paid
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
        LocalDateTime paidSince = Boolean.TRUE.equals(paid)
                ? LocalDateTime.now(VN_ZONE).minusDays(TRASH_RETENTION_DAYS)
                : null;
        return debtRepository
                .findByCustomerAndRange(
                        customerId, from, to, paid, paidSince, AmountSort.debtPageable(page, size, sort))
                .map(DebtMapper::toDto);
    }

    @Transactional(readOnly = true)
    public DebtDto get(Long id) {
        return DebtMapper.toDto(findDebt(id));
    }

    @Transactional
    public DebtDto create(CreateDebtRequest request) {
        DebtType type = request.debtType() != null ? request.debtType() : DebtType.PERSONAL;
        Customer customer = resolveCustomer(type, request.customerName(), request.parentName(), null);

        Debt debt = new Debt();
        debt.setCustomer(customer);
        debt.setDebtType(type);
        debt.setAmount(request.amount());
        debt.setProductNote(trimToNull(request.productNote()));
        debt.setCustomerNote(null);
        debt.setPickerName(trimToNull(request.pickerName()));
        debt.setOccurredAt(request.occurredAt() != null ? request.occurredAt() : LocalDateTime.now(VN_ZONE));
        debt.setPaid(false);
        Debt saved = debtRepository.save(debt);
        syncCustomerTrashState(customer.getId());
        return DebtMapper.toDto(saved);
    }

    /**
     * Tạo nợ từ hóa đơn POS (gắn {@code saleId}). Caller đã validate số tiền (bội 1.000…).
     */
    @Transactional
    public DebtDto createForSale(
            DebtType debtType,
            String customerName,
            String parentName,
            String pickerName,
            BigDecimal amount,
            String productNote,
            LocalDateTime occurredAt,
            Long saleId
    ) {
        DebtType type = debtType != null ? debtType : DebtType.PERSONAL;
        Customer customer = resolveCustomer(type, customerName, parentName, null);
        Debt debt = new Debt();
        debt.setCustomer(customer);
        debt.setDebtType(type);
        debt.setAmount(amount);
        debt.setProductNote(trimToNull(productNote));
        debt.setCustomerNote(null);
        String picker = trimToNull(pickerName);
        debt.setPickerName(picker != null ? picker : customer.getName());
        debt.setOccurredAt(occurredAt != null ? occurredAt : LocalDateTime.now(VN_ZONE));
        debt.setPaid(false);
        debt.setSaleId(saleId);
        Debt saved = debtRepository.save(debt);
        syncCustomerTrashState(customer.getId());
        return DebtMapper.toDto(saved);
    }

    /**
     * Hủy hóa đơn: xóa khoản nợ gắn hóa đơn nếu chưa ai trả.
     *
     * @param expectedAmount số nợ lúc lập hóa đơn; nếu khoản nợ đã bị trừ một phần (số hiện tại khác)
     *                       thì từ chối để không mất dấu tiền đã thu
     */
    @Transactional
    public void deleteUnpaidBySaleId(Long saleId, BigDecimal expectedAmount) {
        debtRepository.findBySaleId(saleId).ifPresent(debt -> {
            if (debt.isPaid()) {
                throw new ApiException("Không thể hủy hóa đơn: khoản nợ đã trả", HttpStatus.BAD_REQUEST);
            }
            if (expectedAmount != null && debt.getAmount().compareTo(expectedAmount) != 0) {
                throw new ApiException(
                        "Không thể hủy hóa đơn: khoản nợ đã được trả một phần",
                        HttpStatus.BAD_REQUEST);
            }
            Long customerId = debt.getCustomer().getId();
            debtRepository.delete(debt);
            syncCustomerTrashState(customerId);
        });
    }

    @Transactional(readOnly = true)
    public Long findDebtIdBySaleId(Long saleId) {
        return debtRepository.findBySaleId(saleId).map(Debt::getId).orElse(null);
    }

    @Transactional
    public DebtDto update(Long id, UpdateDebtRequest request) {
        Debt debt = findDebt(id);
        if (debt.isPaid()) {
            throw new ApiException("Không thể sửa khoản nợ đã trả", HttpStatus.BAD_REQUEST);
        }
        DebtType type = request.debtType() != null ? request.debtType() : DebtType.PERSONAL;
        Customer customer = resolveCustomer(type, request.customerName(), request.parentName(), debt.getCustomer());

        debt.setCustomer(customer);
        debt.setDebtType(type);
        debt.setAmount(request.amount());
        debt.setProductNote(trimToNull(request.productNote()));
        debt.setCustomerNote(null);
        debt.setPickerName(trimToNull(request.pickerName()));
        debt.setOccurredAt(request.occurredAt());
        return DebtMapper.toDto(debtRepository.save(debt));
    }

    /**
     * Công ty: khi sửa giữ đúng khách đang gắn khoản nợ và cập nhật vai trò (chủ/NV)
     * vào parentName — tránh tạo khách trùng và mất lựa chọn khi mở lại form.
     */
    private Customer resolveCustomer(
            DebtType type, String customerName, String parentName, Customer currentCustomer
    ) {
        if (type == DebtType.COMPANY) {
            String name = CustomerNameNormalizer.normalize(customerName);
            if (currentCustomer != null
                    && CustomerNameNormalizer.normalize(currentCustomer.getName()).equals(name)) {
                return customerMergeService.applyCompanyRole(currentCustomer, parentName);
            }
            return customerMergeService.findOrCreateCompany(customerName, parentName);
        }
        return customerMergeService.findOrCreate(customerName, null, parentName);
    }

    @Transactional
    public void delete(Long id) {
        Debt debt = findDebt(id);
        if (debt.getSaleId() != null) {
            // Xóa riêng khoản nợ sẽ để hóa đơn còn nợ mà không có khoản nợ nào; phải hủy cả hóa đơn.
            throw new ApiException(
                    "Khoản nợ này thuộc một hóa đơn bán hàng. Hãy hủy hóa đơn thay vì xóa khoản nợ.",
                    HttpStatus.BAD_REQUEST);
        }
        Long customerId = debt.getCustomer().getId();
        debtRepository.delete(debt);
        syncCustomerTrashState(customerId);
    }

    @Transactional
    public DebtDto markPaid(Long id) {
        return pay(id, null, false);
    }

    /**
     * Trả hết khoản đang chọn (amount = null), hoặc trả theo số tiền.
     * Nếu số tiền &gt; khoản hiện tại và cascadeRemainder = true: phần dư trừ tiếp các khoản còn nợ nhỏ nhất trước.
     */
    @Transactional
    public DebtDto pay(Long id, BigDecimal amount, boolean cascadeRemainder) {
        Debt debt = findDebt(id);
        if (debt.isPaid()) {
            throw new ApiException("Khoản nợ đã được trả", HttpStatus.BAD_REQUEST);
        }
        if (amount == null) {
            debt.setPaid(true);
            debt.setPaidAt(LocalDateTime.now(VN_ZONE));
            Debt saved = debtRepository.save(debt);
            afterCustomerBalanceChange(debt.getCustomer().getId());
            return DebtMapper.toDto(saved);
        }
        if (amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("Số tiền trả phải lớn hơn 0", HttpStatus.BAD_REQUEST);
        }
        MoneyRules.requireDebtAmountShape(amount);

        Long customerId = debt.getCustomer().getId();
        BigDecimal totalUnpaid = debtRepository.sumUnpaidByCustomer(customerId);
        if (amount.compareTo(totalUnpaid) > 0) {
            throw new ApiException(
                    "Số tiền trả không được lớn hơn tổng còn nợ " + formatVnd(totalUnpaid),
                    HttpStatus.BAD_REQUEST
            );
        }

        if (!cascadeRemainder && amount.compareTo(debt.getAmount()) > 0) {
            throw new ApiException(
                    "Số tiền lớn hơn khoản này. Hãy xác nhận tiếp tục trả phần dư vào khoản nhỏ nhất.",
                    HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal remaining = amount;
        remaining = applyPayment(debt, remaining);

        if (cascadeRemainder && remaining.compareTo(BigDecimal.ZERO) > 0) {
            var others = debtRepository.findByCustomerIdAndPaidFalseOrderByAmountAscIdAsc(customerId);
            for (Debt other : others) {
                if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                    break;
                }
                if (other.getId().equals(id) || other.isPaid()) {
                    continue;
                }
                remaining = applyPayment(other, remaining);
            }
        }

        afterCustomerBalanceChange(customerId);
        return DebtMapper.toDto(findDebt(id));
    }

    /**
     * Trả theo số tiền khách đưa: trừ lần lượt các khoản còn nợ nhỏ nhất trước.
     * Khoản bị trừ dở được ghi chú số tiền và thời điểm.
     */
    @Transactional
    public void payAmountForCustomer(Long customerId, BigDecimal amount) {
        if (!customerRepository.existsById(customerId)) {
            throw new ApiException("Không tìm thấy khách hàng", HttpStatus.NOT_FOUND);
        }
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new ApiException("Số tiền trả phải lớn hơn 0", HttpStatus.BAD_REQUEST);
        }
        BigDecimal payAmount = amount.setScale(0, RoundingMode.HALF_UP);
        MoneyRules.requireDebtAmountShape(payAmount);
        BigDecimal totalUnpaid = debtRepository.sumUnpaidByCustomer(customerId);
        if (payAmount.compareTo(totalUnpaid) > 0) {
            throw new ApiException(
                    "Số tiền trả không được lớn hơn tổng còn nợ " + formatVnd(totalUnpaid),
                    HttpStatus.BAD_REQUEST
            );
        }

        BigDecimal remaining = payAmount;
        var debts = debtRepository.findByCustomerIdAndPaidFalseOrderByAmountAscIdAsc(customerId);
        for (Debt debt : debts) {
            if (remaining.compareTo(BigDecimal.ZERO) <= 0) {
                break;
            }
            remaining = applyPayment(debt, remaining);
        }
        afterCustomerBalanceChange(customerId);
    }

    /** Trừ payment vào debt; trả về phần tiền còn dư sau khi trừ. */
    private BigDecimal applyPayment(Debt debt, BigDecimal payment) {
        if (payment.compareTo(BigDecimal.ZERO) <= 0 || debt.isPaid()) {
            return payment;
        }
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        if (payment.compareTo(debt.getAmount()) >= 0) {
            BigDecimal leftover = payment.subtract(debt.getAmount());
            debt.setPaid(true);
            debt.setPaidAt(now);
            debtRepository.save(debt);
            return leftover;
        }
        debt.setAmount(debt.getAmount().subtract(payment));
        appendPartialPayNote(debt, payment, now);
        debtRepository.save(debt);
        return BigDecimal.ZERO;
    }

    private void appendPartialPayNote(Debt debt, BigDecimal paidAmount, LocalDateTime at) {
        String line = "Đã trả -" + formatVnd(paidAmount) + " lúc " + at.format(PARTIAL_NOTE_TIME);
        String existing = debt.getProductNote();
        if (existing == null || existing.isBlank()) {
            debt.setProductNote(line);
        } else {
            debt.setProductNote(existing.trim() + "\n" + line);
        }
    }

    private static String formatVnd(BigDecimal amount) {
        DecimalFormat df = new DecimalFormat("#,###", DecimalFormatSymbols.getInstance(Locale.US));
        df.setRoundingMode(RoundingMode.HALF_UP);
        return df.format(amount) + " đ";
    }

    @Transactional
    public int markPaidBatch(java.util.List<Long> ids) {
        int count = 0;
        LocalDateTime now = LocalDateTime.now(VN_ZONE);
        java.util.Set<Long> customerIds = new java.util.HashSet<>();
        for (Long id : ids) {
            Debt debt = findDebt(id);
            if (debt.isPaid()) {
                continue;
            }
            debt.setPaid(true);
            debt.setPaidAt(now);
            debtRepository.save(debt);
            customerIds.add(debt.getCustomer().getId());
            count++;
        }
        customerIds.forEach(this::afterCustomerBalanceChange);
        return count;
    }

    private void afterCustomerBalanceChange(Long customerId) {
        markQrIfCustomerCleared(customerId);
        syncCustomerTrashState(customerId);
    }

    private void markQrIfCustomerCleared(Long customerId) {
        BigDecimal unpaid = debtRepository.sumUnpaidByCustomer(customerId);
        if (unpaid.compareTo(BigDecimal.ZERO) <= 0) {
            debtQrService.markActiveUsedForCustomer(customerId);
        }
    }

    /**
     * Hết nợ → vào thùng rác; còn nợ / mở lại → ra khỏi thùng rác.
     */
    @Transactional
    public void syncCustomerTrashState(Long customerId) {
        customerRepository.findById(customerId).ifPresent(customer -> {
            BigDecimal unpaid = debtRepository.sumUnpaidByCustomer(customerId);
            boolean hasPaid = debtRepository.existsByCustomerIdAndPaidTrue(customerId);
            if (unpaid.compareTo(BigDecimal.ZERO) <= 0 && hasPaid) {
                if (customer.getTrashedAt() == null) {
                    customer.setTrashedAt(LocalDateTime.now(VN_ZONE));
                    customerRepository.save(customer);
                }
            } else if (customer.getTrashedAt() != null) {
                customer.setTrashedAt(null);
                customerRepository.save(customer);
            }
        });
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
        Debt saved = debtRepository.save(debt);
        syncCustomerTrashState(debt.getCustomer().getId());
        return DebtMapper.toDto(saved);
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

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
