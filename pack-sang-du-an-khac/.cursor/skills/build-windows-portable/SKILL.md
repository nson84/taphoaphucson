---
name: build-windows-portable
description: >-
  Packages Windows Electron portable and NSIS setup with bundled JRE and Spring
  Boot jar on MySQL profile. Use when user says build app, đóng gói, pack, dist,
  Portable.exe, or Setup.exe.
---

# Build Windows portable

## Thứ tự chuẩn

1. Build FE production → copy vào `be/.../static`
2. `.\mvnw.cmd -DskipTests package` → copy `debt-*.jar` → `desktop/resources/debt.jar`
3. Đảm bảo JRE 17 trong `desktop/resources/jre`
4. `desktop`: `CSC_IDENTITY_AUTO_DISCOVERY=false` → `npm run dist`
5. Copy `*-Portable.exe` và `*-Setup.exe` ra Desktop

## MySQL

- Không build/run desktop với H2 cho shop.
- `main.js` phải có `--spring.profiles.active=mysql`.
- Nhắc user: MySQL phải đang chạy trên máy mở `.exe`.

## Lỗi thường gặp

| Triệu chứng | Xử lý |
|:---|:---|
| Copy Portable bị lock | Tắt process app; hoặc copy tên file mới |
| Mất ảnh sau build | Ảnh ở AppData `userData/data/product-images`, không trong exe |
| Splash video đen / chỉ tiếng | Đổi ảnh+mp3; H.264 baseline nếu vẫn dùng video |
| PowerShell `&&` fail | Dùng `;` |

## Sau build

Báo đường dẫn file, login mặc định nếu có, và DB MySQL cần bật.
