---
name: write-docs
description: >-
  Viết/cập nhật docs cho sổ nợ Phúc Sơn (README, comment khi cần). Dùng khi user
  yêu cầu docs, hướng dẫn chạy, hoặc mô tả API.
---

# Write Docs

## Nguyên tắc

- Không docstring thừa cho hàm tự giải thích.
- README phản ánh thật: `be` (`mvnw spring-boot:run`), `fe` (`npm run dev`), MySQL `tap_hoa`, admin/admin123, PIN mặc định.
- Cập nhật README khi đổi script setup, cấu trúc thư mục, cách deploy (`deploy/`).
- Không tạo file markdown mới ngoài README trừ khi user yêu cầu.

## Gợi ý nội dung README (khi cập nhật)

- Chạy local FE/BE/MySQL
- Tài khoản demo
- Cấu trúc `fe/` / `be/` / `scripts/` / `deploy/`
