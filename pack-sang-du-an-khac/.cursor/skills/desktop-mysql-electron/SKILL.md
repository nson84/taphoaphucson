---
name: desktop-mysql-electron
description: >-
  Builds and maintains Windows Electron desktop apps with local MySQL (not H2),
  splash screen, backup folder, and packaged JRE. Use when working on Electron
  main/preload, portable/setup build, splash image/audio, backup path, TAPHOA_DATA_DIR
  / product images, or spring.profiles.active=mysql for desktop.
---

# Desktop + MySQL (Electron)

## Kiến trúc chuẩn

- **1 máy quầy**: Electron + Spring Boot jar + **MySQL local**. Không thiết kế SaaS đa thiết bị.
- Desktop luôn spawn BE với `--spring.profiles.active=mysql`.
- **H2** chỉ cho test / profile phụ — **không** dùng cho app cài shop.
- Ảnh hàng / file ngoài jar: `${TAPHOA_DATA_DIR}/...` (Electron: `userData/data`). Dev thường ghi `be/data/` — **khác** AppData; sau build cần copy ảnh sang `%APPDATA%\<app>\data\` nếu user báo mất ảnh.

## Splash / chờ khởi động

- Ưu tiên **ảnh + mp3** (Electron Portable hay lỗi codec video TikTok/H.265).
- `object-fit: contain` — không kéo méo.
- Load splash bằng `loadFile` + `pathToFileURL` tuyệt đối; đóng gói trong `extraResources`.
- Lời chào/tạm biệt (nếu có): phát **sau** khi UI load xong; tạm biệt khi quit đã sẵn sàng (không lúc còn splash).

## Backup

- Thư mục mặc định cố định (vd. `D:\backup_data_...`), tự `mkdir`.
- App desktop: ghi file qua IPC `writeBackupFile` vào thư mục đó — **không** tải về Downloads.
- Trình duyệt Vite-only mới fallback Downloads.

## Build

- Script kiểu: FE build → copy static vào BE → `mvnw -DskipTests package` → bundle JRE → `electron-builder`.
- Nếu copy Portable ra Desktop lỗi “file in use”: tắt process app hoặc copy tên `-moi.exe`.
- Xác nhận jar có `application-mysql.properties` và `main.js` gắn `mysql`.

## Checklist trước khi báo xong feature desktop

- [ ] Đọc/ cập nhật doc yêu cầu app PC nếu dự án có
- [ ] Không giả định chỉ test trên `localhost:5173` khi đụng in / thoát / backup / quét mã
- [ ] Ảnh/file runtime nằm đúng `TAPHOA_DATA_DIR` trên máy cài
