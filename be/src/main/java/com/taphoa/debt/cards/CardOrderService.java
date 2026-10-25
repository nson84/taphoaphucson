package com.taphoa.debt.cards;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.taphoa.debt.auth.PinService;
import com.taphoa.debt.auth.User;
import com.taphoa.debt.auth.UserRepository;
import com.taphoa.debt.common.ApiException;
import com.taphoa.debt.payment.VtcPayProperties;
import com.taphoa.debt.payment.VtcPaySignatureService;

@Service
public class CardOrderService {

    private final CardProductRepository productRepository;
    private final CardOrderRepository orderRepository;
    private final CardCodeRepository codeRepository;
    private final CardCodeCrypto crypto;
    private final UserRepository userRepository;
    private final PinService pinService;
    private final VtcPayProperties vtcPay;
    private final VtcPaySignatureService signatureService;

    public CardOrderService(
            CardProductRepository productRepository,
            CardOrderRepository orderRepository,
            CardCodeRepository codeRepository,
            CardCodeCrypto crypto,
            UserRepository userRepository,
            PinService pinService,
            VtcPayProperties vtcPay,
            VtcPaySignatureService signatureService
    ) {
        this.productRepository = productRepository;
        this.orderRepository = orderRepository;
        this.codeRepository = codeRepository;
        this.crypto = crypto;
        this.userRepository = userRepository;
        this.pinService = pinService;
        this.vtcPay = vtcPay;
        this.signatureService = signatureService;
    }

    @Transactional(readOnly = true)
    public List<CardProductDto> listProducts() {
        return productRepository.findByActiveTrueOrderByTelcoAscDenominationAsc().stream()
                .map(CardProductDto::from)
                .toList();
    }

    @Transactional
    public CardOrderDto createOrder(CreateCardOrderRequest request) {
        User user = currentUser();
        CardProduct product = productRepository.findById(request.productId())
                .filter(CardProduct::isActive)
                .orElseThrow(() -> new ApiException("Sản phẩm không tồn tại", HttpStatus.NOT_FOUND));

        CardOrder order = new CardOrder();
        order.setReferenceNumber(newReference());
        order.setUserId(user.getId());
        order.setProduct(product);
        order.setAmount(product.getPrice().setScale(0, RoundingMode.HALF_UP));
        order.setStatus(CardOrderStatus.PENDING);
        orderRepository.save(order);

        return toDto(order, buildCheckoutUrl(order), false);
    }

    @Transactional(readOnly = true)
    public List<CardOrderDto> listMyOrders() {
        User user = currentUser();
        return orderRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                .map(o -> toDto(o, null, true))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CardOrderDto> listAwaitingFulfillment() {
        return orderRepository.findByStatusOrderByCreatedAtDesc(CardOrderStatus.PAID).stream()
                .map(o -> toDto(o, null, false))
                .toList();
    }

    @Transactional(readOnly = true)
    public CardOrderDto getByReference(String referenceNumber) {
        CardOrder order = orderRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new ApiException("Không tìm thấy đơn", HttpStatus.NOT_FOUND));
        ensureOwner(order);
        String checkout = order.getStatus() == CardOrderStatus.PENDING ? buildCheckoutUrl(order) : null;
        return toDto(order, checkout, true);
    }

    @Transactional(readOnly = true)
    public CardOrderDto getById(Long id) {
        CardOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy đơn", HttpStatus.NOT_FOUND));
        ensureOwner(order);
        String checkout = order.getStatus() == CardOrderStatus.PENDING ? buildCheckoutUrl(order) : null;
        return toDto(order, checkout, true);
    }

    @Transactional
    public CardOrderDto fulfill(Long id, FulfillCardOrderRequest request) {
        pinService.verifyCurrentUserPin(request.pin());
        CardOrder order = orderRepository.findById(id)
                .orElseThrow(() -> new ApiException("Không tìm thấy đơn", HttpStatus.NOT_FOUND));

        if (order.getStatus() != CardOrderStatus.PAID && order.getStatus() != CardOrderStatus.DELIVERED) {
            throw new ApiException("Chỉ giao mã khi đơn đã thanh toán", HttpStatus.BAD_REQUEST);
        }
        if (codeRepository.existsByOrderId(order.getId())) {
            throw new ApiException("Đơn đã được giao mã", HttpStatus.BAD_REQUEST);
        }

        CardCode code = new CardCode();
        code.setOrder(order);
        code.setSerialEnc(crypto.encrypt(request.serial().trim()));
        code.setCodeEnc(crypto.encrypt(request.code().trim()));
        code.setDeliveredAt(LocalDateTime.now());
        codeRepository.save(code);

        order.setStatus(CardOrderStatus.DELIVERED);
        order.setDeliveredAt(LocalDateTime.now());
        orderRepository.save(order);

        return toDto(order, null, true);
    }

    @Transactional
    public void applyIpn(String data, String signature) {
        if (!signatureService.verifyIpn(data, signature, vtcPay.getSecret())) {
            throw new ApiException("Chữ ký IPN không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        String[] parts = data.split("\\|", -1);
        if (parts.length < 7) {
            throw new ApiException("Data IPN không hợp lệ", HttpStatus.BAD_REQUEST);
        }
        String amountStr = parts[0];
        String message = parts[1];
        String paymentType = parts[2];
        String reference = parts[3];
        int status = Integer.parseInt(parts[4]);
        String transRef = parts[5];
        int websiteId = Integer.parseInt(parts[6]);

        if (websiteId != vtcPay.getWebsiteId() && !vtcPay.isDemoMode()) {
            throw new ApiException("Website ID không khớp", HttpStatus.BAD_REQUEST);
        }

        CardOrder order = orderRepository.findByReferenceNumber(reference)
                .orElseThrow(() -> new ApiException("Đơn không tồn tại", HttpStatus.NOT_FOUND));

        BigDecimal ipnAmount = new BigDecimal(amountStr).setScale(0, RoundingMode.HALF_UP);
        if (order.getAmount().compareTo(ipnAmount) != 0) {
            throw new ApiException("Số tiền IPN không khớp đơn", HttpStatus.BAD_REQUEST);
        }

        if (order.getStatus() == CardOrderStatus.PAID
                || order.getStatus() == CardOrderStatus.DELIVERED
                || order.getStatus() == CardOrderStatus.FAILED) {
            return;
        }

        order.setVtcMessage(message);
        order.setPaymentType(paymentType);
        order.setVtcTransRef(transRef);

        if (status == 1) {
            order.setStatus(CardOrderStatus.PAID);
            order.setPaidAt(LocalDateTime.now());
        } else if (status == 7) {
            order.setStatus(CardOrderStatus.REVIEW);
        } else if (status < 0) {
            order.setStatus(CardOrderStatus.FAILED);
        }
        orderRepository.save(order);
    }

    @Transactional
    public CardOrderDto simulatePay(String referenceNumber) {
        if (!vtcPay.isDemoMode()) {
            throw new ApiException("Chỉ dùng được ở chế độ demo", HttpStatus.FORBIDDEN);
        }
        CardOrder order = orderRepository.findByReferenceNumber(referenceNumber)
                .orElseThrow(() -> new ApiException("Không tìm thấy đơn", HttpStatus.NOT_FOUND));
        ensureOwner(order);
        if (order.getStatus() != CardOrderStatus.PENDING && order.getStatus() != CardOrderStatus.REVIEW) {
            return toDto(order, null, true);
        }
        String data = String.join("|",
                order.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString(),
                "demo",
                "VTCPAY",
                order.getReferenceNumber(),
                "1",
                "DEMO-" + order.getReferenceNumber(),
                String.valueOf(Math.max(vtcPay.getWebsiteId(), 1))
        );
        String sig = signatureService.signIpnData(data, vtcPay.getSecret());
        applyIpn(data, sig);
        order = orderRepository.findByReferenceNumber(referenceNumber).orElseThrow();
        return toDto(order, null, true);
    }

    public String buildCheckoutUrl(CardOrder order) {
        if (vtcPay.isDemoMode()) {
            return vtcPay.getFrontendReturnUrl().replace("/cards/orders", "/cards/demo-pay/")
                    + order.getReferenceNumber();
        }

        Map<String, String> params = new HashMap<>();
        params.put("amount", order.getAmount().setScale(0, RoundingMode.HALF_UP).toPlainString());
        params.put("currency", "VND");
        params.put("reference_number", order.getReferenceNumber());
        params.put("website_id", String.valueOf(vtcPay.getWebsiteId()));
        params.put("url_return", vtcPay.getReturnUrl());
        params.put("language", "vi");
        String signature = signatureService.signRequest(params, vtcPay.getSecret());
        params.put("signature", signature);

        StringBuilder url = new StringBuilder(vtcPay.getCheckoutUrl()).append("?");
        boolean first = true;
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (!first) {
                url.append("&");
            }
            first = false;
            url.append(URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8))
                    .append("=")
                    .append(URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8));
        }
        return url.toString();
    }

    private CardOrderDto toDto(CardOrder order, String checkoutUrl, boolean includeCodes) {
        List<CardCodeDto> codes = List.of();
        if (includeCodes
                && order.getStatus() == CardOrderStatus.DELIVERED
                && isOwner(order)) {
            codes = codeRepository.findByOrderId(order.getId()).stream()
                    .map(c -> new CardCodeDto(crypto.decrypt(c.getSerialEnc()), crypto.decrypt(c.getCodeEnc())))
                    .toList();
        }
        CardProduct p = order.getProduct();
        return new CardOrderDto(
                order.getId(),
                order.getReferenceNumber(),
                order.getStatus().name(),
                order.getAmount(),
                p.getTelco(),
                p.getDenomination(),
                order.getVtcTransRef(),
                order.getPaymentType(),
                order.getPaidAt(),
                order.getDeliveredAt(),
                order.getCreatedAt(),
                checkoutUrl,
                codes
        );
    }

    private String newReference() {
        String ref = "C" + System.currentTimeMillis() + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        return ref.length() > 30 ? ref.substring(0, 30) : ref;
    }

    private User currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) {
            throw new ApiException("Chưa đăng nhập", HttpStatus.UNAUTHORIZED);
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ApiException("Không tìm thấy tài khoản", HttpStatus.UNAUTHORIZED));
    }

    private void ensureOwner(CardOrder order) {
        if (!isOwner(order)) {
            throw new ApiException("Không có quyền xem đơn này", HttpStatus.FORBIDDEN);
        }
    }

    private boolean isOwner(CardOrder order) {
        try {
            return order.getUserId().equals(currentUser().getId());
        } catch (ApiException e) {
            return false;
        }
    }
}
