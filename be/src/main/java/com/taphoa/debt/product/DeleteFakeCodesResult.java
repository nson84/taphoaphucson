package com.taphoa.debt.product;

/**
 * deleted = số hàng mã ảo đã xóa hẳn khỏi DB (hóa đơn vẫn giữ tên/mã snapshot).
 * deactivated = luôn 0 (giữ field tương thích API cũ; không soft-delete mã ảo nữa).
 * stripped = hàng có mã vạch thật, đã bỏ mã phụ nội bộ (SP…, QM…).
 */
public record DeleteFakeCodesResult(int deleted, int deactivated, int stripped) {
}
