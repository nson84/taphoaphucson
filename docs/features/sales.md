# Feature: sales

## Mục đích

Bán hàng (POS): quét mã, giỏ hàng, thanh toán tiền mặt/CK/ghi nợ; trừ tồn; in hóa đơn 58mm; báo cáo doanh thu/lãi. Ghi nợ tái dùng `DebtService`.

## Đã có

### Backend (`be/`)

- [x] Package `sale/` — sales, sale_items, checkout TX, cancel, report
- [x] API: `POST/GET /api/sales`, `GET /api/sales/{id}`, `POST /api/sales/{id}/cancel`, `GET /api/sales/report`
- [x] `debts.sale_id` nullable; tạo nợ khi `debtAmount > 0`
- [x] Integration tests (`SaleIntegrityApiIntegrationTest`: oversell + hủy, idempotency, unit cũ, nợ gắn đơn)
- [x] **Chống trùng hóa đơn**: `CreateSaleRequest.clientRequestId` (≤64 ký tự, unique `sales.client_request_id`); gửi lại cùng id → trả hóa đơn cũ
- [x] **Hoàn tồn đúng khi bán lố**: `sale_items.stock_deducted` lưu số lượng thực đã trừ (kẹp ≥ 0); hủy hóa đơn hoàn đúng số đó (dòng cũ NULL → `qty*factor`)
- [x] `productUnitId` không còn tồn tại → 400 (không tự rơi về đơn vị cơ bản)
- [x] Hủy hóa đơn: chặn nếu nợ gắn đơn đã trả một phần; xóa nợ gắn đơn trực tiếp (`DELETE /api/debts/{id}`) bị chặn — phải hủy hóa đơn
- [x] Migration `V15__sale_idempotency_stock_deducted.sql`
- [x] **Làm tròn tiền lẻ 500 đ**: tổng hóa đơn (sau giảm giá) làm tròn **lên 1.000 đ** khi thanh toán **tiền mặt** hoặc **ghi nợ** (và hỗn hợp có nợ), ví dụ 10.500 → 11.000. **Chuyển khoản giữ nguyên** 10.500. Lưu ở `sales.rounding_amount` (migration `V16`), đã nằm trong `total_amount` nên doanh thu/báo cáo tính theo số khách thực trả; hóa đơn cũ = 0. Logic: `SaleService.roundingFor`; test `SaleRoundingApiIntegrationTest`

### Frontend (`fe/`)

- [x] `PosPage` — `/pos`
- [x] Nháp hóa đơn chưa thanh toán: auto-save `localStorage` (`taphoa-pos-state-v1`); mở POS hiện banner khôi phục; đóng tab có hàng → xác nhận rồi xóa nháp (không checkout); tắt app desktop → `ExitBackupDialog` nhắc số hóa đơn dở, vẫn 3 nút backup, **không** tạo hóa đơn MySQL
- [x] Máy quét USB (keyboard wedge): quét được khi focus không ở ô tìm — thêm thẳng vào hóa đơn, không xổ gợi ý (trừ khi đang gõ ghi chú/khách/SL/giá…). Ô tìm đang focus: chuỗi **số** nhiều phím liên tiếp rất nhanh (≥3 gap &lt; ~35ms) mới coi là máy quét; **chỉ auto-thêm khi đủ 12–14 số** (EAN/UPC) — không auto ở 8 số để tránh gõ tay bị select cả ô rồi số tiếp theo xóa hết
- [x] Gõ tay tên hoặc mã vạch trên ô tìm: luôn hiện gợi ý; Enter hoặc bấm dòng thì thêm vào hóa đơn
- [x] Tìm nhanh `mã-(tên)`: gõ số rồi `-` → UI chèn `()` đặt con trỏ trong ngoặc (vd. `123-(bánh mì)`); gợi ý/Enter lọc **AND** tiền tố/mã chứa + tên chứa (`pos/posSearchQuery.js`)
- [x] Đóng/thanh toán tab đang làm: chọn tab còn lại theo **vị trí trong danh sách** — ưu tiên hóa đơn **liền trước** (bên trái); không còn bên trái thì chọn liền sau; key set trước `setInvoices`, focus ô tìm
- [x] Tab hóa đơn POS kiểu KiotViet: tab chọn = nền trắng + chữ đậm nối xuống vùng bán; tab không chọn = chữ trắng trên nền xanh (không ghim, không gạch/line, không hoa anh đào)
- [x] `SaleListPage` / `SaleDetailPage` / `SaleReportPage` — `/sales`, `/sales/:id`, `/sales/report`
- [x] Báo cáo: xem **Theo ngày / Theo tháng / Theo năm** (lọc khoảng tương ứng; gom `byDay` trên FE)
- [x] POS/DebtForm: `clientRequestId` giữ nguyên khi bấm Thanh toán lại sau lỗi mạng/5xx (`shared/requestId.js`); lỗi hiển thị tại chỗ (`api.js` option `inlineErrors`), giỏ hàng giữ nguyên
- [x] `pos/saleUnit.js` — khớp đơn vị theo id → tên+hệ số; không khớp thì báo lỗi, không bán nhầm đơn vị
- [x] POS panel thanh toán: dòng **Làm tròn +500** khi tiền mặt/nợ (`pos/cashRounding.js` khớp BE); chọn Chuyển khoản thì bỏ làm tròn. Chuyển khoản còn thiếu tiền gửi `TRANSFER` để BE không làm tròn. Panel thanh toán và hóa đơn in KHÔNG hiện dòng Làm tròn (tổng "Khách cần trả" đã gồm làm tròn); trang chi tiết đơn vẫn có thẻ Làm tròn
- [x] `UnitPicker` — chọn ĐVT trên dòng giỏ hàng: nút viên thuốc chữ trắng nền MediumBlue (hover đậm hơn + viền mờ), menu bo tròn sổ sang bên phải (portal/fixed để không bị bảng cắt), đóng bằng Esc/click ngoài
- [x] Brand POS/app accent MediumBlue `#0000CD`; bố cục bán hàng: giỏ **2/3** · panel thanh toán **1/3** chiều ngang — chỉ CSS, không đổi logic
- [x] Nút **Thêm hàng không có mã vạch** → popup chọn từ danh mục (`pos/NoBarcodePickerDialog.jsx`, `codeType=nobarcode`): ảnh, tên, ĐVT, giá bán + giá vốn (tham khảo); nhập SL + đơn giá bán (bội 500đ); link tạo mới `/products/new?noBarcode`. Không tạo hàng mới ngay trên POS
- [x] Đơn giá bán trên POS / checkout: chỉ bội số **500đ** (FE `priceStep.js` + BE `MoneyRules` / `SaleService`); nút ±500 trên popup sửa giá
- [x] In hóa đơn bán 58mm
- [x] Nav **Bán hàng**

## Chưa có / nợ kỹ thuật

- Báo cáo theo nhân viên (Phase 1: chỉ admin)
- Kiểm kho phiếu

## Liên quan

- Products: feature `products`
- Debts: khi nợ → `DebtService.createForSale`
- API: `docs/API_CONTRACT.md` § Sales
