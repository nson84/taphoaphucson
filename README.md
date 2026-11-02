# Tạp hóa Phúc Sơn — Quản lý công nợ

Ứng dụng ghi công nợ + bán hàng tạp hóa nhỏ. Chạy **local trên 1 máy**, không cần deploy cloud.

- **FE:** React (Vite) — `fe/`
- **BE:** Spring Boot — `be/`
- **DB chuẩn:** **MySQL 8** (`tap_hoa`) — dùng cho dev, app desktop, và dữ liệu thật
- **Desktop:** Electron (`desktop/`) đóng gói BE + FE

## Quy trình dev / AI (Cursor)

- **[docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md)** — đọc quy tắc BE/FE, `docs/features/*.md`, chạy test/build, kiểm tra UI (DevTools MCP) trước khi báo xong.
- Rules: `.cursor/rules/` · Flow: `docs/flow/` · Feature docs: `docs/features/`

## Chức năng chính

- Đăng nhập / PIN (admin)
- Công nợ khách, tổng hợp, trả nợ, QR
- Hàng hóa (đa ĐVT), POS bán hàng, lịch sử bán
- Mua thẻ, thùng rác, backup

## Chạy local (MySQL — chuẩn)

1. Cài / bật **MySQL 8**, tạo DB tự động qua JDBC (`createDatabaseIfNotExist`) hoặc sẵn schema `tap_hoa`.
2. User/pass mặc định trong `be/src/main/resources/application.properties`: `root` / `123456` (hoặc env `DB_USER` / `DB_PASSWORD`).
3. Backend (Flyway chạy migration):

```powershell
cd be
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:8080`  
Tài khoản: `admin` / `admin123` — PIN mặc định: `123456`

4. Frontend:

```powershell
cd fe
npm install
npm run dev
```

Mở `http://localhost:5173` (proxy API → `:8080`).

## App Windows (.exe)

```powershell
cd scripts
.\build-desktop.ps1
```

Ra `desktop/dist/`:
- `TaphoaPhucSon-Portable.exe`
- `TaphoaPhucSon-*-Setup.exe`

App desktop start BE với profile **`mysql`** → cần **MySQL đang chạy** trên máy (`tap_hoa`, `root`/`123456` theo `application-mysql.properties`).  
Máy cửa hàng **không cần cài Java** (JRE đóng gói sẵn).  
Đăng nhập: `admin` / `admin123`. Backup: **Cài đặt → Backup** (không cần mật khẩu riêng).

## Ghi chú kỹ thuật (không dùng cho shop)

| Mục | DB |
|:---|:---|
| Dev / desktop / dữ liệu thật | **MySQL** |
| Integration test (`application-test`) | H2 **in-memory** (chỉ CI/test) |
| Profile `local` (tùy chọn) | Dev máy — vẫn **MySQL** (kế thừa `application.properties`) |
| Profile `h2` (tùy chọn) | H2 file — **không** dùng cho app cài; Flyway tắt |

Không chạy desktop hoặc import hàng thật trên profile `h2`.
