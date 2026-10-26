---
name: write-docs
description: >-
  Viết/cập nhật docs cho sổ nợ Phúc Sơn (README, comment khi cần). Dùng khi user
  yêu cầu docs, hướng dẫn chạy, hoặc mô tả API.
---

# Write Docs

## Nguyên tắc

- Không docstring thừa cho hàm tự giải thích.
- README phản ánh thật: chạy local 1 máy; `be` (`mvnw` + profile `local` / H2), `fe` (`npm run dev`), admin/admin123, PIN mặc định.
- Cập nhật README khi đổi script setup hoặc cấu trúc thư mục. Không có phần deploy.
- Không tạo file markdown mới ngoài README trừ khi user yêu cầu.

## Gợi ý nội dung README (khi cập nhật)

- Chạy local FE/BE (H2 profile `local`)
- Tài khoản demo
- Cấu trúc `fe/` / `be/` / `scripts/`
