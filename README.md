# Tạp hóa Phúc Sơn — Quản lý công nợ

Ứng dụng ghi công nợ cửa hàng tạp hóa nhỏ. Chạy **local trên 1 máy**, không cần deploy.

- **FE:** React (Vite) — thư mục `fe/`
- **BE:** Spring Boot (REST, feature packages) — thư mục `be/`
- **DB:** H2 file (mặc định local) hoặc MySQL tùy chọn

## Chức năng

- Đăng nhập / đăng xuất (1 tài khoản admin)
- CRUD khoản nợ (tên khách, ngày giờ VN, ghi chú khách, số tiền, ghi chú sản phẩm)
- Chi tiết khách: lọc nợ theo năm / tháng / ngày, nút **Trả nợ** (khóa dòng và đẩy xuống cuối)
- Tổng hợp nợ, phân trang, tìm theo tên (chứa chuỗi, không phân biệt hoa thường)

## Chạy local

### Cách nhanh (H2, không cần MySQL) — khuyến nghị 1 máy

```powershell
cd be
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

Dữ liệu lưu tại `be/data/`. Backup bằng cách copy thư mục đó.

### Cách MySQL (tùy chọn)

1. Sửa mật khẩu DB trong `be/src/main/resources/application.properties` (`DB_USER` / `DB_PASSWORD`) hoặc set env.
2. Chạy MySQL (local hoặc `docker compose -f docker-compose.dev.yml up -d`).
3. Backend:

```powershell
cd be
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:8080`  
Tài khoản mặc định: `admin` / `admin123`

### Frontend

```bash
cd fe
npm install
npm run dev
```

Mở `http://localhost:5173`

## App Windows (.exe) — 1 máy cửa hàng

App đóng gói sẵn **Java 17** — máy cửa hàng **không cần cài Java**.

```powershell
cd scripts
.\build-desktop.ps1
```

File ra tại `desktop/dist/` (script cũng copy ra Desktop):
- `TaphoaPhucSon-Portable.exe` — chạy luôn
- `TaphoaPhucSon-*-Setup.exe` — bản cài

Đăng nhập: `admin` / `admin123`  
App desktop dùng **MySQL** (`tap_hoa`, user `root` / `123456`) — cần MySQL đang chạy trên máy.  
Backup: trong app **Cài đặt → Backup** (mật khẩu `842003`).
