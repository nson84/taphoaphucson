package com.taphoa.debt.unit.product;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.taphoa.debt.product.BarcodeUtil;

class BarcodeUtilTest {

    @Test
    void acceptsValidGtin() {
        assertTrue(BarcodeUtil.isValidGtin("3017620422003"));
        assertTrue(BarcodeUtil.isValidGtin("8934563215057"));
        assertTrue(BarcodeUtil.isValidGtin("96385074"));
        assertTrue(BarcodeUtil.isValidGtin("036000291452"));
    }

    @Test
    void rejectsInternalAndBrokenCodes() {
        assertFalse(BarcodeUtil.isValidGtin("SP023394"));
        assertFalse(BarcodeUtil.isValidGtin("QM004287"));
        assertFalse(BarcodeUtil.isValidGtin("3017620422004"));
        assertFalse(BarcodeUtil.isValidGtin("0000000000000"));
        assertFalse(BarcodeUtil.isValidGtin("12345"));
        assertFalse(BarcodeUtil.isValidGtin(null));
    }
}
