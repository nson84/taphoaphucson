# API_CONTRACT

Giao kèo FE ↔ BE. Auth: `Authorization: Bearer <jwt>` trừ khi ghi permitAll.

Base: `/api` (dev proxy Vite → `:8080`).

## Auth

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| POST | `/api/auth/login` | public | `{ username, password }` → `{ token, username }` (JWT **36 giờ**, mỗi login cấp token mới). Sai 5 lần → **429** (khóa 1 phút); áp dụng tương tự cho PIN verify/đổi PIN |
| POST | `/api/auth/logout` | public (permitAll) | No-op JWT; client xóa token |
| POST | `/api/profile/pin/verify` | JWT | Verify PIN |
| PUT | `/api/profile/pin` | JWT | Đổi PIN |

## Summary

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/summary` | JWT | Query: `q`, `page`, `size`, `sort`, kind filter → KPI + list khách còn nợ |

## Customers

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/customers` | JWT | List còn dư nợ (`q`, `nameOnly`, kind filters…); `suggest=true` → gợi ý tạo nợ / ô tìm Tổng hợp (gồm hết nợ =0 kể cả thùng rác, `balance` = còn nợ) |
| GET | `/api/customers/{id}` | JWT | Chi tiết |
| GET | `/api/customers/{id}/debts` | JWT | Phiếu nợ theo khách (`paid=false` còn nợ / `paid=true` hết nợ — Thùng rác). `sort` mặc định `dateDesc` (ngày mới→cũ); `dateAsc` / `amountDesc` / `amountAsc` |
| POST | `/api/customers` | JWT | Tạo |
| PUT | `/api/customers/{id}` | JWT | Sửa |
| DELETE | `/api/customers/{id}` | JWT | Xóa |
| POST | `/api/customers/{id}/pay-amount` | JWT | Trả theo số tiền |

## Debts

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/debts` | JWT | List (còn dùng nội bộ/test; FE list toàn cục đã bỏ) |
| GET | `/api/debts/{id}` | JWT | Chi tiết phiếu |
| POST | `/api/debts` | JWT | Tạo nợ |
| PUT | `/api/debts/{id}` | JWT | Sửa |
| DELETE | `/api/debts/{id}` | JWT | Xóa. Nợ gắn hóa đơn (`saleId`) → 400, phải hủy hóa đơn |
| POST | `/api/debts/{id}/pay` | JWT | Trả hết phiếu |
| POST | `/api/debts/pay-batch` | JWT | Trả nhiều phiếu |
| POST | `/api/debts/{id}/unpay` | JWT | Mở lại còn nợ (PIN) |

## Trash / Backup / QR shop

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/trash` | JWT | Khách hết nợ (thùng rác) |
| POST | `/api/settings/backup/download` | JWT | Tải backup JSON (không cần mật khẩu riêng; chỉ cần đăng nhập) |
| GET/PUT | `/api/settings/bank-qr` | JWT | Cấu hình QR ngân hàng |
| POST | `/api/customers/{id}/debt-qr` | JWT | Tạo QR trả nợ |
| POST | `/api/debt-qr/{id}/mark-used` | JWT | Đánh dấu đã dùng |

## Cards / VTCPay

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/card-products` | JWT | Sản phẩm thẻ |
| GET/POST… | `/api/card-orders/**` | JWT | Đơn thẻ, fulfill, simulate-pay |
| POST | `/api/payments/vtcpay/ipn` | public | IPN |
| GET | `/api/payments/vtcpay/return` | public | Return URL |
| GET | `/api/payments/vtcpay/config` | JWT | Config |

## Products

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| GET | `/api/products` | JWT | List/search `q`, `page`, `size`, `activeOnly` |
| GET | `/api/products/{id}` | JWT | Chi tiết |
| GET | `/api/products/by-barcode/{barcode}` | JWT | Tra cứu mã vạch (POS) |
| POST | `/api/products/quick` | JWT | `{ name, sellPrice, costPrice?, unit? }` → `ProductDto`; tạo hàng không mã vạch (`hasPhysicalBarcode=false`), mã nội bộ EAN-13 đầu `29` tăng dần; `sellPrice` phải bội 500đ |
| GET | `/api/products/barcode-check` | JWT | `code`, `excludeId?` → `{ exists, productId, name, barcode, active }`; mã chính/phụ, gồm hàng ngừng bán; `excludeId` bỏ qua hàng đang sửa |
| POST | `/api/products` | JWT | Tạo — `{ barcode?, name, category?, costPrice, sellPrice, stockQty, unit?, units?, variants?, active? }`; `variants[]`: `{ id?, name, sellPrice?, costPrice? }` (giá null = dùng giá chung); `barcode` trống → không mã vạch + tự cấp mã nội bộ; `sellPrice` / unit / variant sellPrice phải bội 500đ; trùng tên (không mã) → 400 |
| POST | `/api/products/{id}/image` | JWT | multipart `file` (JPG/PNG/WebP ≤5MB) → lưu `${TAPHOA_DATA_DIR}/product-images/{id}.ext`, cập nhật `image_filename` |
| GET | `/api/products/{id}/image` | JWT | Stream ảnh; 404 nếu chưa có |
| DELETE | `/api/products/{id}/image` | JWT | Xóa file + `image_filename` |
| POST | `/api/products/{id}/variants/{variantId}/image` | JWT | multipart `file` → `product-images/v{variantId}.ext` |
| GET | `/api/products/{id}/variants/{variantId}/image` | JWT | Stream ảnh kiểu dáng |
| DELETE | `/api/products/{id}/variants/{variantId}/image` | JWT | Xóa ảnh kiểu dáng |
| PUT | `/api/products/{id}` | JWT | Sửa (cùng body; `variants[].id` giữ ảnh khi sửa) |
| DELETE | `/api/products/{id}` | JWT | Xóa mềm (`active=false`) nếu đã từng bán; xóa cứng nếu chưa |

**units[]:** `{ name, factor, sellPrice, costPrice?, base }` — đúng 1 `base` (factor=1). Tồn kho tính theo đơn vị cơ bản. POS bán thùng: `productUnitId` + trừ `qty×factor`.

## Sales

| Method | Path | Auth | Mô tả |
|:---|:---|:---|:---|
| POST | `/api/sales` | JWT | Checkout — xem `CreateSaleRequest`. Có `clientRequestId` (tuỳ chọn, ≤64): gửi lại cùng id → trả hóa đơn đã tạo (idempotent). `productUnitId` không tồn tại → 400. Bán lố tồn cho phép, tồn kẹp về 0. **Làm tròn**: `paymentMethod` = CASH/DEBT/MIXED → `totalAmount` làm tròn lên 1.000 đ, phần cộng thêm trả về ở `roundingAmount`; TRANSFER/CARD/WALLET giữ nguyên |
| GET | `/api/sales` | JWT | List `q`, `from`, `to`, `page`, `size` |
| GET | `/api/sales/{id}` | JWT | Chi tiết + lines |
| POST | `/api/sales/{id}/cancel` | JWT | Hủy: hoàn tồn; chặn nếu nợ gắn đã trả; xóa nợ chưa trả |
| GET | `/api/sales/report` | JWT | `from`, `to` → doanh thu, vốn, lãi, số đơn, theo phương thức TT |

**CreateSaleRequest:** `{ items: [{ productId, qty, productUnitId?, unitPrice? }], paymentMethod: CASH\|TRANSFER\|CARD\|WALLET\|DEBT\|MIXED, paidAmount, discountAmount?, debtType?, customerName?, parentName?, pickerName?, note?, occurredAt? }`

- `productUnitId` optional — đơn vị bán (gói/thùng); null = đơn vị cơ bản. Trừ tồn `qty × factor`.
- `unitPrice` optional — nếu có thì dùng giá POS (sửa đơn giá); không thì lấy giá đơn vị.
- `total = sum(line) - discount`; `debtAmount = total - paidAmount` (DEBT: paid=0; MIXED: 0 < paid < total).
- Có `debtAmount > 0`: bắt buộc khách; `debtAmount` phải ≥ 1000, bội 1000, ≤ 10_000_000 → tạo nợ + `debts.sale_id`.
- Trừ tồn trong cùng transaction.
- Hủy hóa đơn: hoàn tồn; nếu nợ gắn đã trả → chặn; nợ chưa trả → xóa nợ.

Chi tiết body/field: xem DTO trong `be/...` hoặc mở rộng section này khi đổi API.
