# Tạp hóa Phú Cường — Quản lý công nợ

Ứng dụng ghi công nợ cửa hàng tạp hóa nhỏ.

- **FE:** React (Vite) — thư mục `fe/`
- **BE:** Spring Boot (REST, feature packages) — thư mục `be/`
- **DB:** MySQL

## Chức năng

- Đăng nhập / đăng xuất (1 tài khoản admin)
- CRUD khoản nợ (tên khách, ngày giờ VN, ghi chú khách, số tiền, ghi chú sản phẩm)
- Chi tiết khách: lọc nợ theo năm / tháng / ngày, nút **Trả nợ** (khóa dòng và đẩy xuống cuối)
- Tổng hợp nợ, phân trang, tìm theo tên (chứa chuỗi, không phân biệt hoa thường)

## Chạy local

### Cách nhanh (H2, không cần MySQL)

```powershell
cd be
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

### Cách MySQL

1. Sửa mật khẩu DB trong `be/src/main/resources/application.properties` (`DB_USER` / `DB_PASSWORD`) hoặc set env.
2. Chạy MySQL (local hoặc `docker compose -f docker-compose.dev.yml up -d`).
3. Backend:

```powershell
cd be
.\mvnw.cmd spring-boot:run
```

API: `http://localhost:8080`  
Tài khoản mặc định: `admin` / `admin123`

### 3. Frontend

```bash
cd fe
npm install
npm run dev
```

Mở `http://localhost:5173`

## Deploy VPS (rẻ)

```bash
cd fe && npm run build && cd ..
cd deploy
cp .env.example .env   # sửa mật khẩu
docker compose up -d --build
```

Truy cập IP VPS cổng 80. Chi phí ước tính VPS VN ~120–150k/tháng (4GB RAM).
