package com.taphoa.debt.qr;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.text.Normalizer;
import java.time.Instant;
import java.util.Locale;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.customer.Customer;
import com.taphoa.debt.customer.CustomerRepository;

@Service
public class DebtQrService {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    /** Cấu hình QR cố định — không chỉnh qua giao diện. */
    private static final String DEFAULT_BANK_BIN = "970436";
    private static final String DEFAULT_ACCOUNT_NO = "NP82501867062299VCB";
    private static final String DEFAULT_ACCOUNT_NAME = "NGUYEN THI XUAN";

    private final ShopQrConfigRepository configRepository;
    private final DebtQrPaymentRepository paymentRepository;
    private final CustomerRepository customerRepository;

    public DebtQrService(
            ShopQrConfigRepository configRepository,
            DebtQrPaymentRepository paymentRepository,
            CustomerRepository customerRepository
    ) {
        this.configRepository = configRepository;
        this.paymentRepository = paymentRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional
    public ShopQrConfigDto getConfig() {
        return toConfigDto(ensureConfig());
    }

    /** Cấu hình QR cố định — bỏ qua body, luôn trả về mặc định hệ thống. */
    @Transactional
    public ShopQrConfigDto updateConfig(ShopQrConfigRequest request) {
        return toConfigDto(ensureConfig());
    }

    @Transactional
    public DebtQrDto createForCustomer(Long customerId, BigDecimal amount) {
        ShopQrConfig config = ensureConfig();
        if (!config.isEnabled()) {
            throw new ApiException("Chưa bật QR chuyển khoản trong Cài đặt", HttpStatus.BAD_REQUEST);
        }
        if (config.getAccountNo().isBlank() || config.getAccountName().isBlank()) {
            throw new ApiException("Chưa cấu hình số tài khoản / tên chủ TK cho QR", HttpStatus.BAD_REQUEST);
        }
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new ApiException("Không tìm thấy khách hàng", HttpStatus.NOT_FOUND));

        BigDecimal payAmount = amount.setScale(0, RoundingMode.HALF_UP);
        if (payAmount.remainder(BigDecimal.valueOf(1000)).compareTo(BigDecimal.ZERO) != 0) {
            throw new ApiException("Số tiền QR phải là bội số của 1.000 đ", HttpStatus.BAD_REQUEST);
        }

        // Chỉ 1 QR hiệu lực / khách — mã cũ bị thay thế
        for (DebtQrPayment old : paymentRepository.findByCustomerIdAndStatus(customerId, DebtQrStatus.ACTIVE)) {
            old.setStatus(DebtQrStatus.SUPERSEDED);
            paymentRepository.save(old);
        }

        String code = nextCode();
        String asciiName = toAsciiUpper(customer.getName());
        String transferContent = buildTransferContent(asciiName, code);
        String displayContent = "Khach hang " + asciiName + " da thanh toan no " + payAmount.toPlainString()
                + " ma " + code;
        String qrUrl = buildVietQrUrl(config, payAmount, transferContent);

        DebtQrPayment payment = new DebtQrPayment();
        payment.setCustomer(customer);
        payment.setAmount(payAmount);
        payment.setCode(code);
        payment.setTransferContent(transferContent);
        payment.setQrImageUrl(qrUrl);
        payment.setStatus(DebtQrStatus.ACTIVE);
        payment = paymentRepository.save(payment);

        return toDto(payment, displayContent);
    }

    @Transactional
    public DebtQrDto markUsed(Long id) {
        DebtQrPayment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy mã QR", HttpStatus.NOT_FOUND));
        if (payment.getStatus() != DebtQrStatus.ACTIVE) {
            throw new ApiException("Mã QR đã hết hiệu lực", HttpStatus.BAD_REQUEST);
        }
        payment.setStatus(DebtQrStatus.USED);
        payment.setUsedAt(Instant.now());
        return toDto(paymentRepository.save(payment), null);
    }

    /** Khi khách hết nợ — đánh dấu QR ACTIVE của khách là đã dùng. */
    @Transactional
    public void markActiveUsedForCustomer(Long customerId) {
        Instant now = Instant.now();
        for (DebtQrPayment p : paymentRepository.findByCustomerIdAndStatus(customerId, DebtQrStatus.ACTIVE)) {
            p.setStatus(DebtQrStatus.USED);
            p.setUsedAt(now);
            paymentRepository.save(p);
        }
    }

    private ShopQrConfig ensureConfig() {
        ShopQrConfig c = configRepository.findById(1L).orElseGet(() -> {
            ShopQrConfig neu = new ShopQrConfig();
            neu.setId(1L);
            return neu;
        });
        c.setEnabled(true);
        c.setBankBin(DEFAULT_BANK_BIN);
        c.setAccountNo(DEFAULT_ACCOUNT_NO);
        c.setAccountName(DEFAULT_ACCOUNT_NAME);
        return configRepository.save(c);
    }

    private String nextCode() {
        for (int attempt = 0; attempt < 20; attempt++) {
            StringBuilder sb = new StringBuilder(6);
            for (int i = 0; i < 6; i++) {
                sb.append(CODE_CHARS.charAt(RANDOM.nextInt(CODE_CHARS.length())));
            }
            String code = sb.toString();
            if (!paymentRepository.existsByCode(code)) {
                return code;
            }
        }
        throw new ApiException("Không tạo được mã QR", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    static String toAsciiUpper(String raw) {
        if (raw == null) {
            return "";
        }
        String n = Normalizer.normalize(raw.trim(), Normalizer.Form.NFD)
                .replaceAll("\\p{M}+", "")
                .replace('đ', 'd')
                .replace('Đ', 'D')
                .toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9 ]+", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return n;
    }

    static String buildTransferContent(String asciiName, String code) {
        String name = asciiName.length() > 16 ? asciiName.substring(0, 16).trim() : asciiName;
        String content = ("KH " + name + " NO " + code).replaceAll("\\s+", " ").trim();
        return content.length() > 50 ? content.substring(0, 50).trim() : content;
    }

    private String buildVietQrUrl(ShopQrConfig config, BigDecimal amount, String addInfo) {
        String base = "https://img.vietqr.io/image/"
                + config.getBankBin().trim()
                + "-"
                + config.getAccountNo().trim()
                + "-qr_only.png";
        return base
                + "?amount=" + amount.toPlainString()
                + "&addInfo=" + URLEncoder.encode(addInfo, StandardCharsets.UTF_8)
                + "&accountName=" + URLEncoder.encode(config.getAccountName().trim(), StandardCharsets.UTF_8);
    }

    private ShopQrConfigDto toConfigDto(ShopQrConfig c) {
        return new ShopQrConfigDto(c.isEnabled(), c.getBankBin(), c.getAccountNo(), c.getAccountName());
    }

    private DebtQrDto toDto(DebtQrPayment p, String displayContent) {
        String display = displayContent;
        if (display == null) {
            display = "Khach hang " + toAsciiUpper(p.getCustomer().getName())
                    + " da thanh toan no " + p.getAmount().toPlainString()
                    + " ma " + p.getCode();
        }
        return new DebtQrDto(
                p.getId(),
                p.getCustomer().getId(),
                p.getAmount(),
                p.getCode(),
                p.getTransferContent(),
                display,
                p.getQrImageUrl(),
                p.getStatus().name(),
                p.getCreatedAt()
        );
    }
}
