package com.taphoa.debt.product;

/** Kết quả kiểm tra một mã vạch đã gắn với hàng hóa nào chưa (dùng cảnh báo sớm trên form hàng hóa). */
public record BarcodeCheckDto(boolean exists, Long productId, String name, String barcode, boolean active) {

    public static BarcodeCheckDto none() {
        return new BarcodeCheckDto(false, null, null, null, false);
    }

    public static BarcodeCheckDto of(Product p) {
        return new BarcodeCheckDto(true, p.getId(), p.getName(), p.getBarcode(), p.isActive());
    }
}
