package com.taphoa.debt.payment;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import com.taphoa.debt.cards.CardOrderService;

@RestController
@RequestMapping("/api/payments/vtcpay")
public class VtcPayController {

    private final CardOrderService cardOrderService;
    private final VtcPayProperties properties;

    public VtcPayController(CardOrderService cardOrderService, VtcPayProperties properties) {
        this.cardOrderService = cardOrderService;
        this.properties = properties;
    }

    @PostMapping(value = "/ipn", consumes = {MediaType.APPLICATION_FORM_URLENCODED_VALUE, MediaType.ALL_VALUE})
    public ResponseEntity<String> ipn(
            @RequestParam(value = "data", required = false) String data,
            @RequestParam(value = "signature", required = false) String signature
    ) {
        cardOrderService.applyIpn(data, signature);
        return ResponseEntity.ok("OK");
    }

    @GetMapping("/return")
    public RedirectView browserReturn(
            @RequestParam(value = "reference_number", required = false) String reference,
            @RequestParam(value = "status", required = false) String status
    ) {
        String base = properties.getFrontendReturnUrl();
        String ref = reference == null ? "" : URLEncoder.encode(reference, StandardCharsets.UTF_8);
        String st = status == null ? "" : URLEncoder.encode(status, StandardCharsets.UTF_8);
        String target = base + "/" + ref + (st.isEmpty() ? "" : "?status=" + st);
        return new RedirectView(target);
    }

    @GetMapping("/config")
    public ResponseEntity<?> config() {
        return ResponseEntity.ok(java.util.Map.of(
                "demoMode", properties.isDemoMode(),
                "websiteId", properties.getWebsiteId()
        ));
    }
}
