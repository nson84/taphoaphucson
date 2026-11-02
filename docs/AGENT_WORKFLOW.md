# Quy trình làm việc cho Agent / Dev (Tạp hóa Phúc Sơn)

Tài liệu **một chỗ** để trước khi code: đọc quy tắc BE/FE, đọc feature docs, kiểm tra UI/API, chạy test — **rồi mới báo hoàn thành**.

Các rule Cursor tương ứng: `.cursor/rules/agent-workflow.mdc` (alwaysApply), `flow-dev.mdc`, `feature-docs.mdc`, `runnable-before-done.mdc`.

---

## 1. Trước khi sửa code

### 1.0 App PC (bắt buộc mỗi chức năng)

Đọc **[DESKTOP_APP_REQUIREMENTS.md](DESKTOP_APP_REQUIREMENTS.md)** — sản phẩm là **app Windows cài trên 1 máy quầy** (Electron + MySQL local), không thiết kế như SaaS đa thiết bị. Rule Cursor: `.cursor/rules/desktop-app-requirements.mdc` (`alwaysApply: true`).

### 1.1 Quy tắc theo phạm vi

| Phạm vi | Đọc |
|:---|:---|
| **Chung / fullstack** | [flow/flow-dev-fullstack.md](flow/flow-dev-fullstack.md), `.cursor/rules/flow-dev.mdc` |
| **Chỉ `be/`** | [flow/flow-dev-backend.md](flow/flow-dev-backend.md), `.cursor/rules/flow-dev-backend.mdc` |
| **Chỉ `fe/`** | [flow/flow-dev-frontend.md](flow/flow-dev-frontend.md), `.cursor/rules/flow-dev-frontend.mdc` |
| **Đổi schema MySQL** | `.cursor/rules/db-changes-mysql.mdc` |

### 1.2 Feature docs (bắt buộc)

1. Xác định feature → mở `docs/features/<name>.md`.
2. Đọc mục **Đã có / Chưa có** — tái sử dụng code/API có sẵn, không làm trùng.
3. Đối chiếu [PROGRESS.md](PROGRESS.md), [PAGES.md](PAGES.md), [API_CONTRACT.md](API_CONTRACT.md).

| Làm việc với | File feature |
|:---|:---|
| Login, PIN, logout | [features/auth.md](features/auth.md) |
| Tổng hợp `/` | [features/summary.md](features/summary.md) |
| Form nợ `/debts/*` | [features/debts.md](features/debts.md) |
| Khách / chi tiết nợ | [features/customers.md](features/customers.md) |
| Thùng rác | [features/trash.md](features/trash.md) |
| Cài đặt, backup | [features/settings.md](features/settings.md) |
| Mua thẻ | [features/cards.md](features/cards.md) |
| QR / VTCPay | [features/payments-qr.md](features/payments-qr.md) |
| Trang lỗi / 401 | [features/error.md](features/error.md) |
| Hàng hóa | [features/products.md](features/products.md) |
| POS, lịch sử bán, báo cáo | [features/sales.md](features/sales.md) |

Feature mới: copy [features/_TEMPLATE.md](features/_TEMPLATE.md) → `docs/features/<name>.md`, cập nhật PROGRESS + PAGES/API.

---

## 2. Trong lúc code

### Backend (`be/`)

- Luôn **DTO** — không trả entity thô ra API.
- JPA **LAZY** mặc định; tránh N+1.
- Đổi schema → Flyway trong `be/src/main/resources/db/migration/`.
- Đụng API → cập nhật `docs/API_CONTRACT.md`.

### Frontend (`fe/`)

- Feature code: `fe/src/features/`; dùng chung: `fe/src/shared/`.
- Gọi API qua `fe/src/shared/api.js` — không thêm fetch wrapper riêng.
- UI: design tokens trong `fe/src/index.css` (`--accent`, `--shadow-elevated`, spacing…).
- Màn có data async: loading / error / empty.

### Bỏ / xóa tính năng

Xóa **cả BE và FE**, cập nhật docs (xem `flow-dev.mdc`).

---

## 3. Trước khi báo hoàn thành (bắt buộc)

**Không** báo “xong” chỉ vì đã ghi file. Phải có bằng chứng chạy được.

### 3.1 Build / lint

```powershell
# FE — mọi thay đổi fe/
cd fe
npm run build
npm run lint

# BE — mọi thay đổi be/
cd be
.\mvnw.cmd -q test
# hoặc ít nhất compile:
.\mvnw.cmd -q -DskipTests compile
```

### 3.2 Test tự động

| Phạm vi | Lệnh |
|:---|:---|
| BE (integration/unit) | `cd be` → `.\mvnw.cmd test` |
| FE | `npm run build` + `npm run lint` (chưa có unit test Jest — dùng build làm gate) |

Nếu test fail **trong phạm vi sửa** → sửa xong mới báo hoàn thành. Lỗi sẵn có ngoài phạm vi → ghi rõ trong báo cáo.

### 3.3 Kiểm tra thủ công / MCP DevTools

Khi đổi UI hoặc luồng người dùng:

1. Chạy `fe`: `npm run dev` (BE `:8080` nếu cần API).
2. Dùng **Chrome DevTools MCP** (skill `chrome-devtools` trong Cursor) khi có:
   - Mở đúng route bị ảnh hưởng.
   - Console không lỗi đỏ; network API 2xx (hoặc 401 đúng luồng).
   - Hover/focus/form submit hoạt động.
3. Không có MCP browser: mô tả bước reproduce + output lệnh build/test.

Khi đổi API:

- Gọi endpoint (curl / Swagger / integration test).
- FE proxy `5173` → `8080` khi dev local.

### 3.4 Cập nhật docs (cùng session)

- [ ] `docs/features/<name>.md` — checklist Đã có / Chưa có
- [ ] `PROGRESS.md` nếu trạng thái feature đổi
- [ ] `PAGES.md` / `API_CONTRACT.md` nếu route/API đổi
- [ ] `DECISION_LOG.md` nếu quyết định kiến trúc/UX quan trọng

---

## 4. Báo cáo khi trả lời user

Gồm ngắn gọn:

1. File đã đổi.
2. Feature doc đã đọc/cập nhật.
3. Lệnh đã chạy + kết quả (build/test).
4. Đã kiểm tra UI/API thế nào (DevTools / route / endpoint).
5. Việc chưa kiểm tra được (nếu có).

---

## 5. Tài liệu liên quan

- [cursor.md](../cursor.md) — tóm tắt “runnable before done”
- [README.md](../README.md) — chạy local MySQL + FE + desktop
- Skills (tùy task): `.cursor/skills/` — `write-tests`, `build-ui`, `clean-code`, …

## 6. Ghi chú môi trường (2026-10)

| Kiểm tra | Ghi chú |
|:---|:---|
| `fe` `npm run build` | Gate chính cho FE |
| `fe` `npm run lint` (oxlint) | Có thể lỗi **native binding** trên Windows nếu `node_modules` thiếu optional dep → thử `npm i` lại; khi lint không chạy được vẫn bắt buộc `build` pass |
| `be` `.\mvnw.cmd test` | H2 profile `test`; nếu fail test **ngoài phạm vi** sửa → ghi rõ trong báo cáo (vd. `CreateDebtRequestValidationTest.productNoteTooLong_rejected`) |
| Chrome DevTools MCP | Cần MCP `plugin-devtools-for-agents-chrome-devtools` bật trong Cursor; đọc skill `chrome-devtools` trước khi dùng |
