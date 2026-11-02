---
name: write-docs
description: >-
  Viết/cập nhật docs cho sổ nợ Phúc Sơn (README, comment khi cần). Dùng khi user
  yêu cầu docs, hướng dẫn chạy, hoặc mô tả API.
---

# Write Docs

## Nguyên tắc

- Không docstring thừa cho hàm tự giải thích.
- README phản ánh thật: **MySQL** chuẩn cho dev + desktop; `be` (`mvnw` không profile), `fe` (`npm run dev`), admin/admin123, PIN mặc định.
- Không mô tả H2 như cách chạy shop/desktop. H2 chỉ ghi chú ngắn: test in-memory / profile `local` tùy chọn.
- Cập nhật README khi đổi script setup hoặc cấu trúc thư mục. Không có phần deploy.
- Được tạo/cập nhật docs flow dự án khi user yêu cầu hoặc khi rule feature-docs bắt buộc:
  `docs/PAGES.md`, `docs/API_CONTRACT.md`, `docs/PROGRESS.md`, `docs/DECISION_LOG.md`,
  `docs/features/<name>.md` (template `_TEMPLATE.md`).
- Không tạo markdown lan man ngoài các file trên + README trừ khi user yêu cầu.

## Gợi ý nội dung README (khi cập nhật)

- Chạy local FE/BE với **MySQL**
- App desktop = MySQL (`--spring.profiles.active=mysql`)
- Tài khoản demo
- Cấu trúc `fe/` / `be/` / `desktop/` / `scripts/`
