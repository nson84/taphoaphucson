---
name: pos-shop-ux-vn
description: >-
  Vietnamese POS / grocery shop UX conventions: date-month-year filters, toast
  notifications, product variants with default style, customer suggest by parent
  name, debt navigate back to customer. Use when building POS, sales reports,
  product variants, customer search, settings/backup UX, or Vietnamese date UI.
---

# UX tạp hóa / POS (VN)

## Ngày tháng năm (báo cáo)

- Nhãn tháng tiếng Việt (`Tháng M/yyyy`), không English month.
- Từ ≤ Đến; nếu từ > đến → **đổi chỗ** hai giá trị.
- Ngày không tồn tại (vd. 32/11) → toast lỗi, **revert** giá trị hợp lệ trước; không để text đỏ phá layout nếu đã chọn toast-only.
- Mode **tháng**: một tháng (không range “tháng 1 → tháng 10”). Tháng hiện tại = ngày 1 → **hôm nay**.
- Mode **năm**: một năm; năm hiện tại kết thúc ở hôm nay.

## Toast / thông báo

- Lỗi validation quan trọng → notification; tránh inline đỏ làm vỡ layout.
- Chỉnh size theo yêu cầu user; giữ nhất quán global CSS.

## Hàng hóa / biến thể

- Một sản phẩm nhiều kiểu (ảnh/giá riêng tùy chọn); tồn kho chung.
- POS chọn kiểu bằng nút (như chọn màu ĐT): gồm **Mặc định** (ảnh/giá gốc) + các kiểu thêm.
- List gợi ý tìm theo tên **và** mã vạch; bấm gợi ý → mở sửa / chọn hàng.

## Khách / nợ

- Gợi ý khách khớp cả tên phụ huynh (`parentName`), hiển thị dạng `Tên(bố mẹ X)`.
- Sau tạo nợ (không phải POS) → về trang chi tiết khách, không nhảy tổng hợp.

## Tiền

- Giá bán thường bội 500đ; nợ/làm tròn theo rule dự án (đọc MoneyRules / docs nếu có).
