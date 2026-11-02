# Decision Log

| Ngày | Quyết định | Lý do |
|:---|:---|:---|
| 2026-10 | Monorepo `be/` + `fe/`; rules Cursor `.cursor/rules` (không CLAUDE.md) | Solo fullstack, một chỗ docs |
| 2026-10 | Bỏ trang Danh sách nợ; Tạo nợ trên Tổng hợp | Trùng UX với Tổng hợp → Chi tiết khách |
| 2026-10 | Brand UI: Segoe UI; accent hồng đậm `#b91c45`; mint dịu; không box-shadow glow nút; Lucide | Màu tối hơn, bỏ viền sáng hồng trên POS/nút |
| 2026-11-02 | Brand accent → **MediumBlue** `#0000CD` (thay toàn bộ hồng/đỏ UI); POS tỉ lệ gần KiotViet (pay ~360px, cart scale ~1.08, topbar ~64px) | Chủ shop muốn giao diện xanh + form bán hàng giống mẫu KiotViet; không đổi logic |
| 2026-11-02 | POS tab: bỏ sakura; active = gradient/viền động `--accent`; ghim không bị `overflow` cắt; sau thanh toán chọn tab **index−1** | UX tab rõ ràng; sửa lỗi luôn nhảy về HĐ 1 |
| 2026-10 | Xóa mã ảo = hard-delete; `sale_items.product_id` nullable (ON DELETE SET NULL); giữ snapshot tên/mã trên HĐ | Tránh soft-delete còn đếm 1 trên UI |
| 2026-10-27 | **DESKTOP_APP_REQUIREMENTS.md** + rule `desktop-app-requirements.mdc`: mọi feature phải đọc yêu cầu app PC (Electron, 1 máy, localStorage nháp POS + MySQL) trước khi code | Tránh thiết kế kiểu web cloud; nháp ghi nợ dùng `localStorage` qua `posDebtDraft.js` |
| 2026-10 | Docs/README: **MySQL chuẩn** (dev + desktop); H2 chỉ test / profile `local` tùy chọn — không mô tả H2 là mặc định | Khớp `desktop/main.js` `--spring.profiles.active=mysql` |
| 2026-10 | Mỗi feature có `docs/features/<name>.md` | Biết đã có gì trước khi sửa; follow flow-dev |
| 2026-10 | Không ảnh nền cắt chéo màn trong app | User duyệt thấy không hợp |
| 2026-10 | POS Phase 1: chỉ admin, không NV/RBAC; 1 SKU = 1 barcode; không kiểm kho phiếu | Scope MVP tạp hóa |
| 2026-10 | Bán nợ → `DebtService.createForSale` + `debts.sale_id`; giữ rule tiền nợ (bội 1.000) | Tái dùng công nợ, không luồng song song |
| 2026-10 | Hàng hóa: nhóm optional; nhiều ĐVT (`product_units`) quy đổi về đơn vị cơ bản | Bán gói/thùng/lốc trên POS |
| 2026-10-28 | **Rà soát hệ thống**: JWT secret ngẫu nhiên per-máy (`userData/jwt-secret.txt`) + backend bind `127.0.0.1` trong app desktop; `desktop/main.js` kiểm tra MySQL trước khi spawn backend | Secret mặc định trong repo cho phép giả token; cổng backend không nên lộ ra LAN |
| 2026-10-28 | Checkout idempotent bằng `clientRequestId`; `sale_items.stock_deducted` để hoàn tồn đúng khi bán lố; unit lạ → 400; nợ gắn đơn không xóa trực tiếp | Mạng chập chờn gây trùng đơn; hủy đơn bán lố làm tồn bị thổi phồng; tránh lệch công nợ |
| 2026-10-28 | `AttemptLimiter` in-memory: 5 lần sai → 429/1 phút cho login, PIN | Chống dò PIN/mật khẩu; không cần bảng DB vì app 1 máy |
| 2026-10-29 | Bỏ mật khẩu riêng cho backup; `POST /api/settings/backup/download` chỉ cần JWT | Chủ shop muốn sao lưu nhanh khi tắt app, không nhập mật khẩu thêm |
| 2026-10-28 | Thoát app desktop: 3 lựa chọn (tắt không lưu / lưu rồi tắt / ở lại); thư mục backup mặc định `D:\backup_data_banhang_taphoaphucson` | Chủ shop muốn chủ động quyết định có backup mỗi lần tắt; mặc định cố định để không phải chọn lại |
| 2026-10-28 | Form hàng hóa/khoản nợ: cảnh báo rời trang khi đang tạo/sửa dở (`useLeaveGuard`); form hàng hóa cảnh báo trùng mã vạch sớm + nút tới sản phẩm đã có | Tránh mất dữ liệu nhập dở và tránh tạo trùng mã (BE vẫn chặn 400 là lớp cuối) |
| 2026-10-28 | Làm tròn tổng hóa đơn lên 1.000 đ cho tiền mặt và ghi nợ; chuyển khoản giữ nguyên; lưu riêng `rounding_amount` | Không còn tiền 500 đ; hàng giá 3.500/4.500 nên hay lẻ 500; ghi nợ bắt buộc bội số 1.000. Làm tròn **lên** (không xuống) với mọi số lẻ |
| 2026-10-28 | Hàng không mã vạch: cờ `has_physical_barcode` + mã nội bộ EAN-13 đầu 29; POS chỉ **chọn** từ danh mục (có ảnh); tạo/sửa ở màn hàng hóa | Tái sử dụng SP, nhận diện bằng ảnh; GTIN nội bộ không bị "xóa mã ảo" dọn; ảnh lưu `TAPHOA_DATA_DIR/product-images` ngoài jar |
| 2026-10-28 | Giá bán / đơn giá bán bắt buộc bội 500đ (FE+BE); giá vốn không áp dụng | Tránh nhập 7.001đ; khớp tiền Việt thực tế |
| 2026-10-28 | Giữ nguyên admin/admin123 (chưa bắt đổi lần đầu) | Chờ chủ shop quyết định; ghi vào nợ kỹ thuật `features/auth.md` |
| 2026-10 | Khi user bảo bỏ phần nào → xóa cả BE + FE + cập nhật docs | Tránh lệch nửa stack / API chết dư |
| 2026-11-02 | POS ô tìm: không auto-thêm mã 8 số khi focus ô tìm; máy quét focus-box cần ≥3 gap &lt;35ms + đủ 12–14 số. Shortcut gõ `số-` → `số-()` tìm AND mã+tên | Gõ tay 8 số bị coi scan → select cả ô → số 9 xóa hết; cần tìm nhanh theo một phần mã kèm tên |
| 2026-11-02 | JWT phiên đăng nhập **36 giờ** (`app.jwt.expiration-ms=129600000`); login lại = token mới, đếm lại 36 giờ | Trước 24 giờ hơi ngắn cho ca bán liên tục / quên đăng nhập lại |
