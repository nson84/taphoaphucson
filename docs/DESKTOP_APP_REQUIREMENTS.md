# Yêu cầu app PC (Desktop) — Tạp hóa Phúc Sơn

**Mục tiêu sản phẩm:** app **Windows cài trên 1 máy quầy** (Electron + BE Spring + MySQL local), **không** thiết kế như web SaaS đa thiết bị / đa tab cloud.

Mỗi lần làm **chức năng mới** hoặc **đổi luồng lớn**, đọc file này **trước** khi code (cùng `docs/features/<name>.md`).

---

## 1. Kiến trúc triển khai

| Thành phần | Chuẩn |
|:---|:---|
| Giao diện | React (`fe/`), build vào BE static hoặc dev Vite |
| API | Spring Boot `localhost:8080` (BE chạy cùng app desktop) |
| Dữ liệu | **MySQL 8** `tap_hoa` trên **cùng máy** — profile `mysql` khi chạy `.exe` |
| Màn chờ khởi động | Ảnh `splash.jpg` + nhạc `splash.mp3` (loop) full cửa sổ; `object-fit: contain`; không dùng video (Electron Portable hay lỗi codec) |
| Desktop | `desktop/` (Electron), build: `scripts/build-desktop.ps1` |
| Java trên máy bán | **Không bắt buộc** (JRE đóng gói); **MySQL phải có** trên máy shop |

Dev: `be` + `fe` npm dev. Release / kiểm tra shop: ưu tiên nghĩ theo **bản desktop**, không chỉ trình duyệt dev.

---

## 2. Giả định vận hành (1 quầy, 1 PC)

- **Một cửa hàng, một máy tính quầy** — không yêu cầu đồng bộ realtime giữa nhiều PC (trừ khi user yêu cầu rõ).
- Nhân viên dùng **chuột, bàn phím, máy quét USB (keyboard wedge)** — POS, form nhập liệu phải thao tác nhanh, focus rõ, ít bước thừa.
- **In hóa đơn:** dùng `window.taphoaDesktop` / `fe/src/shared/print.js` — in im trên desktop; không chỉ dựa vào `window.print()` trình duyệt.
- Màn hình **desktop-first** (POS, bảng, form rộng); responsive mobile là phụ, không ưu tiên thay UX quầy.

---

## 3. Lưu trạng thái tạm (nháp, giỏ, tab)

Phù hợp app PC **một máy**:

- **`localStorage`** cho trạng thái POS / nháp ghi nợ gắn tab hóa đơn (`taphoa-pos-state-v1`, `posDebtDraft.js`) — **chấp nhận được**; sống qua tắt app / mở lại (cùng profile Electron).
- **Không** coi `sessionStorage` là nguồn chính cho dữ liệu nghiệp vụ quan trọng (chỉ legacy / migrate).
- Dữ liệu **đã lưu** (bán hàng, nợ, hàng) → **MySQL qua API**, không chỉ localStorage.
- Khi thiết kế nháp: gắn **`invoiceKey` / id nội bộ tab**, dọn nháp khi đóng tab / hoàn tất ghi nợ; cảnh báo khi giỏ thay đổi so với nháp.

Không cần backend “draft sync” trừ khi product yêu cầu multi-device.

---

## 4. Khi implement feature — checklist

1. **Luồng chính chạy được trên desktop** (BE + MySQL + FE build), không phụ thuộc dịch vụ ngoài (trừ QR/VTCPay đã có).
2. **POS / in / thoát app / backup** — nếu đụng: đọc `desktop/main.js`, `settings`, `print.js`.
3. **Persistence:** ưu tiên API + MySQL; cache local chỉ cho UX tạm (giỏ, nháp form), có dọn dẹp khi xong / hủy tab.
4. **Không** giả định user mở nhiều tab trình duyệt cùng shop; Electron thường **một cửa sổ**.
5. Feature doc: ghi rõ hành vi **trên app cài** nếu khác dev browser (in, đường dẫn file backup, v.v.).

---

## 5. Kiểm tra trước khi báo xong

- `fe`: `npm run build` (+ lint nếu có).
- `be`: `.\mvnw.cmd test` hoặc compile khi đụng API/schema.
- Luồng UI: DevTools hoặc chạy app; feature POS/in/backup → **nên** thử trên bản desktop hoặc mô phỏng `taphoaDesktop` khi có.
- Cập nhật `docs/features/<name>.md`, `DECISION_LOG.md` nếu quyết định kiến trúc desktop (lưu nháp, in, v.v.).

---

## 6. Liên kết

- [README.md](../README.md) — chạy MySQL, build `.exe`
- [AGENT_WORKFLOW.md](AGENT_WORKFLOW.md) — quy trình agent
- [features/sales.md](features/sales.md) — POS, ghi nợ từ quầy
- [features/debts.md](features/debts.md) — form nợ
- Rule Cursor: `.cursor/rules/desktop-app-requirements.mdc`
