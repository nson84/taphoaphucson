package com.taphoa.debt.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedHashMap;
import java.util.Map;

import org.junit.jupiter.api.Test;

class VtcPaySignatureServiceTest {

    private final VtcPaySignatureService service = new VtcPaySignatureService();

    @Test
    void signsRequestWithAlphabetOrderAndSecret() {
        Map<String, String> params = new LinkedHashMap<>();
        params.put("amount", "100000");
        params.put("currency", "VND");
        params.put("reference_number", "ORDER123");
        params.put("website_id", "123");
        String secret = "SecretKeyTest16";
        String sig = service.signRequest(params, secret);
        String expected = service.sha256Hex("100000|VND|ORDER123|123|" + secret);
        assertEquals(expected, sig);
    }

    @Test
    void verifiesIpnSignature() {
        String data = "100000|ok|VTCPAY|ORDER123|1|TX1|123";
        String secret = "SecretKeyTest16";
        String signature = service.signIpnData(data, secret);
        assertTrue(service.verifyIpn(data, signature, secret));
    }
}
