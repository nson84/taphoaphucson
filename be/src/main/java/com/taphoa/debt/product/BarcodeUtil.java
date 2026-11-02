package com.taphoa.debt.product;

public final class BarcodeUtil {

    private BarcodeUtil() {
    }

    /**
     * Ghép 12 chữ số đầu với chữ số kiểm tra thành EAN-13 hợp lệ.
     * Đầu số 20–29 là dải GS1 dành cho dùng nội bộ cửa hàng (không trùng hàng có mã thật).
     */
    public static String ean13FromPrefix12(String first12) {
        if (first12 == null || !first12.matches("\\d{12}")) {
            throw new IllegalArgumentException("Cần đúng 12 chữ số");
        }
        int sum = 0;
        for (int i = 0; i < 12; i++) {
            int d = first12.charAt(i) - '0';
            sum += (i % 2 == 0) ? d : d * 3;
        }
        int check = (10 - sum % 10) % 10;
        return first12 + check;
    }

    /** GTIN-8 / UPC-A (12) / EAN-13 / GTIN-14 với chữ số kiểm tra đúng. */
    public static boolean isValidGtin(String code) {
        if (code == null) {
            return false;
        }
        String c = code.trim();
        int len = c.length();
        if (len != 8 && len != 12 && len != 13 && len != 14) {
            return false;
        }
        for (int i = 0; i < len; i++) {
            if (!Character.isDigit(c.charAt(i))) {
                return false;
            }
        }
        if (c.chars().allMatch(ch -> ch == '0')) {
            return false;
        }
        int sum = 0;
        boolean weight3 = true;
        for (int i = len - 2; i >= 0; i--) {
            int d = c.charAt(i) - '0';
            sum += weight3 ? d * 3 : d;
            weight3 = !weight3;
        }
        int check = (10 - sum % 10) % 10;
        return check == c.charAt(len - 1) - '0';
    }
}
