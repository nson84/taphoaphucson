# PROGRESS

Cập nhật cuối mỗi session feature.

| Feature | BE | FE | Doc | Ghi chú |
|:---|:---:|:---:|:---|:---|
| auth | ✅ | ✅ | [features/auth.md](features/auth.md) | JWT login/logout, PIN profile |
| summary | ✅ | ✅ | [features/summary.md](features/summary.md) | Tổng hợp + nút Tạo nợ |
| debts | ✅ | ✅ | [features/debts.md](features/debts.md) | Form tạo/sửa; đã bỏ list toàn cục |
| customers | ✅ | ✅ | [features/customers.md](features/customers.md) | Chi tiết + trả nợ / merge |
| trash | ✅ | ✅ | [features/trash.md](features/trash.md) | Khách hết nợ 60 ngày |
| settings | ✅ | ✅ | [features/settings.md](features/settings.md) | PIN, backup, bank QR |
| cards | ✅ | ✅ | [features/cards.md](features/cards.md) | Mua thẻ + PIN gate |
| qr / VTCPay | ✅ | partial | [features/payments-qr.md](features/payments-qr.md) | QR nợ + thanh toán thẻ |
| error pages | — | ✅ | [features/error.md](features/error.md) | 401/403/404/500 |
| products | ✅ | ✅ | [features/products.md](features/products.md) | Mã vạch, giá, tồn |
| sales / POS | ✅ | ✅ | [features/sales.md](features/sales.md) | Checkout + nợ + báo cáo |

## Đang làm / tiếp theo

- (POS Phase 1 xong — kiểm kho / NV sau)

## Quy ước cập nhật

1. Sửa code feature → cập nhật `docs/features/<name>.md` (mục Đã có / Chưa có).
2. Đổi route → `PAGES.md`.
3. Đổi API → `API_CONTRACT.md`.
4. Quyết định kiến trúc → `DECISION_LOG.md`.
