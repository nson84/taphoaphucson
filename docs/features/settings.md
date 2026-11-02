# Feature: settings

## Mục đích

Cài đặt PIN, thư mục backup, cấu hình bank QR; dialog thoát app + sao lưu.

## Đã có

### Backend (`be/`)

- [x] `/api/profile/pin*`
- [x] `/api/settings/backup/*`
- [x] `/api/settings/bank-qr`

### Frontend (`fe/`)

- [x] `SettingsPage`
- [x] `ExitBackupDialog` (shared) — khi bấm đóng app desktop hiện **3 nút**: (1) Tắt phần mềm, không lưu dữ liệu; (2) Lưu dữ liệu và Tắt phần mềm (không cần mật khẩu); (3) Ở lại phần mềm. Lưu lỗi (vd. không ghi được thư mục) → không tắt, hiện lỗi, có nút "Đổi thư mục"
- [x] Electron IPC chọn thư mục (khi chạy desktop). **Thư mục mặc định** `D:\backup_data_banhang_taphoaphucson` (`DEFAULT_BACKUP_DIR` trong `desktop/main.js`, tự tạo nếu chưa có). Nút **Tải bản sao lưu** trên app desktop ghi file vào thư mục này (không tải về Downloads); trình duyệt dev vẫn tải về Downloads
- [x] `BackupService`: giá trị `LocalDateTime/LocalDate/...` được chuẩn hóa sang chuỗi ISO (trước đây backup lỗi 500 khi DB có cột thời gian như `trashed_at`); test `BackupServiceNormalizeTest`, `BackupApiIntegrationTest`

## Chưa có / nợ kỹ thuật

-

## Liên quan

- auth (PIN), payments-qr (bank QR)
