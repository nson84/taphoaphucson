package com.taphoa.debt.payment;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.TreeMap;

import org.springframework.stereotype.Service;

@Service
public class VtcPaySignatureService {

    /**
     * Build SHA-256 hex of values sorted by key (alphabet), joined by '|', then secret.
     * Only include keys that have non-blank values (as sent on the request).
     */
    public String signRequest(Map<String, String> params, String secret) {
        TreeMap<String, String> sorted = new TreeMap<>(String.CASE_INSENSITIVE_ORDER);
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (e.getValue() == null || e.getValue().isBlank()) {
                continue;
            }
            if ("signature".equalsIgnoreCase(e.getKey())) {
                continue;
            }
            sorted.put(e.getKey().toLowerCase(Locale.ROOT), e.getValue());
        }
        List<String> parts = new ArrayList<>(sorted.values());
        parts.add(secret);
        return sha256Hex(String.join("|", parts));
    }

    /** IPN signature: amount|message|payment_type|reference_number|status|trans_ref_no|website_id|secret */
    public String signIpnData(String dataPipeSeparated, String secret) {
        return sha256Hex(dataPipeSeparated + "|" + secret);
    }

    public boolean verifyIpn(String data, String signature, String secret) {
        if (data == null || signature == null) {
            return false;
        }
        String expected = signIpnData(data, secret);
        return expected.equalsIgnoreCase(signature.trim());
    }

    public String sha256Hex(String plaintext) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(plaintext.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }

    /** Stable key order for docs examples that list fixed field order. */
    public String joinInOrder(List<String> values) {
        return String.join("|", values.stream().map(v -> v == null ? "" : v).toList());
    }

    public Comparator<String> alphaComparator() {
        return String.CASE_INSENSITIVE_ORDER;
    }
}
