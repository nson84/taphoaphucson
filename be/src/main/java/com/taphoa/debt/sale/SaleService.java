package com.taphoa.debt.sale;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.common.MoneyRules;
import com.taphoa.debt.customer.CustomerRepository;
import com.taphoa.debt.debt.DebtDto;
import com.taphoa.debt.debt.DebtService;
import com.taphoa.debt.debt.DebtType;
import com.taphoa.debt.product.Product;
import com.taphoa.debt.product.ProductRepository;
import com.taphoa.debt.product.ProductUnit;
import com.taphoa.debt.product.ProductVariant;

@Service
public class SaleService {

    private static final BigDecimal MAX_DEBT = BigDecimal.valueOf(10_000_000);
    private static final DateTimeFormatter CODE_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final DebtService debtService;

    public SaleService(
            SaleRepository saleRepository,
            ProductRepository productRepository,
            CustomerRepository customerRepository,
            DebtService debtService
    ) {
        this.saleRepository = saleRepository;
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.debtService = debtService;
    }

    @Transactional
    public SaleDto checkout(CreateSaleRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            throw new ApiException("Giỏ hàng không được trống", HttpStatus.BAD_REQUEST);
        }

        // Gửi lại cùng một lần thanh toán (mất mạng / bấm 2 lần): trả hóa đơn đã tạo, không tạo trùng.
        String clientRequestId = trimToNull(request.clientRequestId());
        if (clientRequestId != null) {
            var existing = saleRepository.findByClientRequestId(clientRequestId);
            if (existing.isPresent()) {
                Long existingId = existing.get().getId();
                Sale full = saleRepository.findByIdWithItems(existingId).orElse(existing.get());
                return toDto(full, debtService.findDebtIdBySaleId(existingId));
            }
        }

        LocalDateTime occurredAt = request.occurredAt() != null
                ? request.occurredAt()
                : LocalDateTime.now(DebtService.VN_ZONE);

        BigDecimal discount = nz(request.discountAmount());
        BigDecimal merchandise = BigDecimal.ZERO;
        BigDecimal costTotal = BigDecimal.ZERO;
        List<PreparedLine> lines = new ArrayList<>();

        for (CreateSaleItemRequest line : request.items()) {
            Product product = productRepository.findById(line.productId())
                    .orElseThrow(() -> new ApiException("Không tìm thấy hàng hóa id=" + line.productId(), HttpStatus.BAD_REQUEST));
            if (!product.isActive()) {
                throw new ApiException("Hàng hóa đã ngừng bán: " + product.getName(), HttpStatus.BAD_REQUEST);
            }
            product.getUnits().size();
            product.getVariants().size();
            ProductUnit unit = resolveUnit(product, line.productUnitId());
            ProductVariant variant = resolveVariant(product, line.variantId());
            int qty = line.qty();
            int factor = Math.max(1, unit.getFactor());
            // Không chặn bán khi thiếu/âm tồn — cửa hàng nhỏ thường lười nhập tồn kho.
            BigDecimal defaultSell = unit.getSellPrice();
            if (variant != null && variant.getSellPrice() != null && unit.isBase()) {
                defaultSell = variant.getSellPrice();
            }
            BigDecimal unitPrice = line.unitPrice() != null ? line.unitPrice() : defaultSell;
            if (unitPrice.compareTo(BigDecimal.ZERO) < 0) {
                throw new ApiException("Đơn giá không được âm", HttpStatus.BAD_REQUEST);
            }
            MoneyRules.requireSellPriceMultipleOf500(unitPrice, "Đơn giá");
            BigDecimal lineTotal = unitPrice.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            BigDecimal unitCost = unit.getCostPrice() != null ? unit.getCostPrice()
                    : product.getCostPrice().multiply(BigDecimal.valueOf(factor));
            if (variant != null && variant.getCostPrice() != null && unit.isBase()) {
                unitCost = variant.getCostPrice();
            }
            BigDecimal lineCost = unitCost.multiply(BigDecimal.valueOf(qty)).setScale(2, RoundingMode.HALF_UP);
            merchandise = merchandise.add(lineTotal);
            costTotal = costTotal.add(lineCost);
            String variantName = variant != null ? variant.getName() : null;
            lines.add(new PreparedLine(
                    product, qty, unitPrice, lineTotal, unitCost,
                    unit.getId(), unit.getName(), factor, variantName
            ));
        }

        if (discount.compareTo(merchandise) > 0) {
            throw new ApiException("Giảm giá không được lớn hơn tổng tiền hàng", HttpStatus.BAD_REQUEST);
        }

        BigDecimal payableBeforeRounding = merchandise.subtract(discount).setScale(2, RoundingMode.HALF_UP);
        PaymentMethod method = request.paymentMethod();
        // Tiền mặt / ghi nợ: làm tròn lên 1.000 đ (không còn tiền 500 đ). Chuyển khoản giữ nguyên.
        BigDecimal rounding = roundingFor(method, payableBeforeRounding);
        BigDecimal totalDue = payableBeforeRounding.add(rounding).setScale(2, RoundingMode.HALF_UP);
        BigDecimal paid = nz(request.paidAmount());

        if (method == PaymentMethod.DEBT) {
            paid = BigDecimal.ZERO;
        }

        if (paid.compareTo(totalDue) > 0) {
            // Tiền thừa: chỉ ghi nhận đủ totalDue vào paid_amount
            paid = totalDue;
        }

        BigDecimal debtAmount = totalDue.subtract(paid).setScale(2, RoundingMode.HALF_UP);
        if (debtAmount.compareTo(BigDecimal.ZERO) < 0) {
            debtAmount = BigDecimal.ZERO;
        }

        if (method == PaymentMethod.CASH || method == PaymentMethod.TRANSFER
                || method == PaymentMethod.CARD || method == PaymentMethod.WALLET) {
            if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
                method = PaymentMethod.MIXED;
            }
        } else if (method == PaymentMethod.DEBT) {
            debtAmount = totalDue;
            paid = BigDecimal.ZERO;
        }

        if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
            validateDebtAmount(debtAmount);
            if (request.customerName() == null || request.customerName().isBlank()) {
                throw new ApiException("Bán nợ cần chọn / nhập khách hàng", HttpStatus.BAD_REQUEST);
            }
        }

        Sale sale = new Sale();
        sale.setCode(nextCode(occurredAt));
        sale.setPaymentMethod(method);
        sale.setTotalAmount(totalDue);
        sale.setDiscountAmount(discount);
        sale.setRoundingAmount(rounding);
        sale.setPaidAmount(paid);
        sale.setDebtAmount(debtAmount);
        sale.setCostTotal(costTotal);
        sale.setNote(trimToNull(request.note()));
        sale.setOccurredAt(occurredAt);
        sale.setClientRequestId(clientRequestId);

        for (PreparedLine pl : lines) {
            SaleItem item = new SaleItem();
            item.setProduct(pl.product());
            item.setBarcode(pl.product().getBarcode());
            String baseName = pl.product().getName();
            String variantName = pl.variantName();
            item.setVariantName(variantName);
            item.setProductName(variantName == null || variantName.isBlank()
                    ? baseName
                    : (baseName + " — " + variantName));
            item.setQty(pl.qty());
            item.setUnitName(pl.unitName());
            item.setUnitFactor(pl.unitFactor());
            item.setProductUnitId(pl.productUnitId());
            item.setUnitPrice(pl.unitPrice());
            item.setCostPrice(pl.costPrice());
            item.setLineTotal(pl.lineTotal());
            Product p = pl.product();
            // Vẫn cho bán khi thiếu tồn, nhưng không trừ xuống dưới 0.
            // Ghi lại số tồn thực sự đã trừ để hủy hóa đơn hoàn đúng (không làm tồn phình ra).
            int wanted = pl.qty() * pl.unitFactor();
            int available = Math.max(0, p.getStockQty());
            int deducted = Math.min(available, wanted);
            item.setStockDeducted(deducted);
            sale.addItem(item);

            p.setStockQty(p.getStockQty() - deducted);
            productRepository.save(p);
        }

        Sale saved = saleRepository.save(sale);

        Long debtId = null;
        if (debtAmount.compareTo(BigDecimal.ZERO) > 0) {
            String productNote = trimToNull(request.productNote());
            if (productNote == null) {
                productNote = lines.stream()
                        .map(l -> "-" + l.product().getName() + " x" + l.qty())
                        .collect(Collectors.joining("\n"));
            }
            if (productNote.length() > 2000) {
                productNote = productNote.substring(0, 1997) + "...";
            }
            DebtDto debt = debtService.createForSale(
                    request.debtType() != null ? request.debtType() : DebtType.PERSONAL,
                    request.customerName().trim(),
                    trimToNull(request.parentName()),
                    trimToNull(request.pickerName()),
                    debtAmount,
                    productNote,
                    occurredAt,
                    saved.getId()
            );
            debtId = debt.id();
            saved.setCustomer(customerRepository.findById(debt.customerId()).orElse(null));
            saved = saleRepository.save(saved);
        }

        return toDto(saved, debtId);
    }

    @Transactional(readOnly = true)
    public SaleDto get(Long id) {
        Sale sale = saleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy hóa đơn", HttpStatus.NOT_FOUND));
        Long debtId = debtService.findDebtIdBySaleId(sale.getId());
        return toDto(sale, debtId);
    }

    @Transactional(readOnly = true)
    public Page<SaleDto> search(String q, LocalDateTime from, LocalDateTime to, int page, int size) {
        String query = q == null ? "" : q.trim();
        return saleRepository
                .search(query, from, to, PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "occurredAt")))
                .map(s -> toDto(s, debtService.findDebtIdBySaleId(s.getId())));
    }

    @Transactional
    public SaleDto cancel(Long id) {
        Sale sale = saleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy hóa đơn", HttpStatus.NOT_FOUND));
        cancelInternal(sale);
        return toDto(sale, null);
    }

    /**
     * Cập nhật hóa đơn: hủy hóa đơn cũ (hoàn tồn) rồi tạo hóa đơn mới theo giỏ đã sửa.
     * Không chặn thiếu tồn khi tạo mới (cùng quy tắc checkout).
     * Khoản nợ chưa trả của hóa đơn cũ bị xóa; nếu đơn mới còn nợ sẽ tạo khoản nợ mới.
     * Retry cùng clientRequestId (mất mạng sau khi đã hủy cũ): trả hóa đơn mới đã tạo, không lỗi.
     */
    @Transactional
    public SaleDto replace(Long id, CreateSaleRequest request) {
        String clientRequestId = trimToNull(request.clientRequestId());
        if (clientRequestId != null) {
            var existing = saleRepository.findByClientRequestId(clientRequestId);
            if (existing.isPresent()) {
                Long existingId = existing.get().getId();
                Sale full = saleRepository.findByIdWithItems(existingId).orElse(existing.get());
                return toDto(full, debtService.findDebtIdBySaleId(existingId));
            }
        }

        Sale old = saleRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy hóa đơn", HttpStatus.NOT_FOUND));
        if (old.isCancelled()) {
            throw new ApiException("Hóa đơn đã hủy — không thể cập nhật", HttpStatus.BAD_REQUEST);
        }
        String oldCode = old.getCode();
        cancelInternal(old);

        CreateSaleRequest withNote = withAmendNote(request, oldCode);
        return checkout(withNote);
    }

    private void cancelInternal(Sale sale) {
        if (sale.isCancelled()) {
            throw new ApiException("Hóa đơn đã hủy", HttpStatus.BAD_REQUEST);
        }
        debtService.deleteUnpaidBySaleId(sale.getId(), sale.getDebtAmount());
        for (SaleItem item : sale.getItems()) {
            Product p = item.getProduct();
            if (p == null) {
                continue;
            }
            int factor = item.getUnitFactor() <= 0 ? 1 : item.getUnitFactor();
            // Hóa đơn mới: hoàn đúng số tồn đã trừ. Hóa đơn cũ (null): hoàn qty * factor như trước.
            int restore = item.getStockDeducted() != null
                    ? item.getStockDeducted()
                    : item.getQty() * factor;
            p.setStockQty(p.getStockQty() + restore);
            productRepository.save(p);
        }
        sale.setCancelledAt(LocalDateTime.now(DebtService.VN_ZONE));
        saleRepository.save(sale);
    }

    private static CreateSaleRequest withAmendNote(CreateSaleRequest request, String oldCode) {
        // Chỉ giữ lần sửa gần nhất — không nối chuỗi "Sửa từ HD… — Sửa từ HD…"
        String prefix = "Sửa từ " + oldCode;
        String custom = stripAmendRefs(request.note());
        String note = custom.isEmpty() ? prefix : prefix + " — " + custom;
        if (note.length() > 500) {
            note = note.substring(0, 497) + "...";
        }
        return new CreateSaleRequest(
                request.items(),
                request.paymentMethod(),
                request.paidAmount(),
                request.discountAmount(),
                request.debtType(),
                request.customerName(),
                request.parentName(),
                request.pickerName(),
                note,
                request.productNote(),
                request.occurredAt(),
                request.clientRequestId()
        );
    }

    /** Bỏ các đoạn "Sửa từ …" cũ, giữ lại ghi chú tay (nếu có). */
    static String stripAmendRefs(String raw) {
        if (raw == null || raw.isBlank()) {
            return "";
        }
        String cleaned = raw.trim()
                .replaceAll("(?iu)Sửa từ\\s+\\S+", "")
                .replaceAll("[—–\\-]+", " ")
                .replaceAll("\\s{2,}", " ")
                .trim();
        return cleaned;
    }

    @Transactional(readOnly = true)
    public SaleReportDto report(LocalDate fromDate, LocalDate toDate) {
        if (fromDate == null || toDate == null) {
            throw new ApiException("from và to là bắt buộc (yyyy-MM-dd)", HttpStatus.BAD_REQUEST);
        }
        if (toDate.isBefore(fromDate)) {
            throw new ApiException("to phải >= from", HttpStatus.BAD_REQUEST);
        }
        LocalDateTime from = fromDate.atStartOfDay();
        LocalDateTime to = toDate.plusDays(1).atStartOfDay();
        List<Sale> sales = saleRepository.findActiveInRange(from, to);

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal cost = BigDecimal.ZERO;
        BigDecimal debtTotal = BigDecimal.ZERO;
        Map<PaymentMethod, BigDecimal> byMethod = new EnumMap<>(PaymentMethod.class);
        Map<String, SaleReportDto.DailyRow> byDay = new LinkedHashMap<>();

        for (Sale s : sales) {
            revenue = revenue.add(s.getTotalAmount());
            cost = cost.add(s.getCostTotal());
            debtTotal = debtTotal.add(s.getDebtAmount());
            byMethod.merge(s.getPaymentMethod(), s.getTotalAmount(), BigDecimal::add);

            String day = s.getOccurredAt().toLocalDate().toString();
            SaleReportDto.DailyRow row = byDay.get(day);
            if (row == null) {
                byDay.put(day, new SaleReportDto.DailyRow(
                        day, s.getTotalAmount(), s.getCostTotal(),
                        s.getTotalAmount().subtract(s.getCostTotal()), 1
                ));
            } else {
                BigDecimal r = row.revenue().add(s.getTotalAmount());
                BigDecimal c = row.cost().add(s.getCostTotal());
                byDay.put(day, new SaleReportDto.DailyRow(day, r, c, r.subtract(c), row.saleCount() + 1));
            }
        }

        Map<String, BigDecimal> methodMap = new LinkedHashMap<>();
        for (var e : byMethod.entrySet()) {
            methodMap.put(e.getKey().name(), e.getValue());
        }

        return new SaleReportDto(
                revenue,
                cost,
                revenue.subtract(cost),
                sales.size(),
                debtTotal,
                methodMap,
                new ArrayList<>(byDay.values())
        );
    }

    private String nextCode(LocalDateTime at) {
        String base = "HD" + CODE_TIME.format(at);
        String code = base;
        int i = 0;
        while (saleRepository.findByCode(code).isPresent()) {
            i++;
            code = base + "-" + i;
        }
        return code;
    }

    private void validateDebtAmount(BigDecimal amount) {
        MoneyRules.requireDebtAmountShape(amount);
        if (amount.compareTo(MAX_DEBT) > 0) {
            throw new ApiException("Số tiền nợ tối đa là 10.000.000 đ", HttpStatus.BAD_REQUEST);
        }
    }

    private SaleDto toDto(Sale sale, Long debtId) {
        BigDecimal profit = sale.getTotalAmount().subtract(sale.getCostTotal());
        List<SaleItemDto> items = sale.getItems() == null
                ? List.of()
                : sale.getItems().stream().map(SaleItemDto::from).toList();
        Long customerId = sale.getCustomer() != null ? sale.getCustomer().getId() : null;
        String customerName = sale.getCustomer() != null ? sale.getCustomer().getName() : null;
        return new SaleDto(
                sale.getId(),
                sale.getCode(),
                customerId,
                customerName,
                sale.getPaymentMethod(),
                sale.getTotalAmount(),
                sale.getDiscountAmount(),
                sale.getRoundingAmount(),
                sale.getPaidAmount(),
                sale.getDebtAmount(),
                sale.getCostTotal(),
                profit,
                sale.getNote(),
                sale.getOccurredAt(),
                sale.getCancelledAt(),
                debtId,
                items,
                sale.getCreatedAt(),
                sale.getUpdatedAt()
        );
    }

    private static final BigDecimal ROUNDING_STEP = BigDecimal.valueOf(1000);

    /**
     * Phần cần cộng thêm để tổng hóa đơn tròn 1.000 đ.
     * Áp dụng cho tiền mặt, ghi nợ và thanh toán hỗn hợp (phần còn lại ghi nợ); chuyển khoản/thẻ/ví giữ nguyên.
     * Ví dụ 10.500 → +500 (11.000); 10.000 → 0.
     */
    public static BigDecimal roundingFor(PaymentMethod method, BigDecimal amount) {
        boolean roundsUp = method == PaymentMethod.CASH || method == PaymentMethod.DEBT
                || method == PaymentMethod.MIXED;
        if (!roundsUp || amount == null || amount.signum() <= 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        BigDecimal remainder = amount.remainder(ROUNDING_STEP);
        if (remainder.signum() == 0) {
            return BigDecimal.ZERO.setScale(2);
        }
        return ROUNDING_STEP.subtract(remainder).setScale(2, RoundingMode.HALF_UP);
    }

    private static BigDecimal nz(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    private static String trimToNull(String v) {
        if (v == null) {
            return null;
        }
        String t = v.trim();
        return t.isEmpty() ? null : t;
    }

    private ProductVariant resolveVariant(Product product, Long variantId) {
        if (variantId == null) {
            return null;
        }
        List<ProductVariant> variants = product.getVariants();
        if (variants == null || variants.isEmpty()) {
            throw new ApiException(
                    "Hàng «" + product.getName() + "» không còn kiểu dáng đã chọn. Hãy thêm lại vào hóa đơn.",
                    HttpStatus.BAD_REQUEST);
        }
        return variants.stream()
                .filter(v -> variantId.equals(v.getId()))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        "Kiểu dáng của «" + product.getName()
                                + "» đã thay đổi. Hãy xóa dòng và thêm lại hàng vào hóa đơn.",
                        HttpStatus.BAD_REQUEST));
    }

    private ProductUnit resolveUnit(Product product, Long productUnitId) {
        List<ProductUnit> units = product.getUnits();
        if (units == null || units.isEmpty()) {
            ProductUnit fallback = new ProductUnit();
            fallback.setName(product.getUnit() != null ? product.getUnit() : "Cái");
            fallback.setFactor(1);
            fallback.setSellPrice(product.getSellPrice());
            fallback.setCostPrice(product.getCostPrice());
            fallback.setBase(true);
            return fallback;
        }
        ProductUnit base = units.stream()
                .filter(ProductUnit::isBase)
                .findFirst()
                .orElse(units.get(0));
        if (productUnitId == null) {
            return base;
        }
        // POS có thể giữ unitId cũ sau khi sửa hàng (units bị xóa/tạo lại → id mới).
        // Không tự hạ về đơn vị cơ bản: giá của thùng nhưng chỉ trừ tồn 1 gói là sai số liệu.
        return units.stream()
                .filter(u -> productUnitId.equals(u.getId()))
                .findFirst()
                .orElseThrow(() -> new ApiException(
                        "Đơn vị tính của «" + product.getName()
                                + "» đã thay đổi. Hãy xóa dòng và thêm lại hàng vào hóa đơn.",
                        HttpStatus.BAD_REQUEST));
    }

    private record PreparedLine(
            Product product,
            int qty,
            BigDecimal unitPrice,
            BigDecimal lineTotal,
            BigDecimal costPrice,
            Long productUnitId,
            String unitName,
            int unitFactor,
            String variantName
    ) {
    }
}
