package com.taphoa.debt.customer;

public final class CustomerNameNormalizer {

    private CustomerNameNormalizer() {
    }

    /** Trim + gộp khoảng trắng thừa để "sơn" / " Sơn " cùng một người. */
    public static String normalize(String name) {
        if (name == null) {
            return "";
        }
        return name.trim().replaceAll("\\s+", " ");
    }
}
