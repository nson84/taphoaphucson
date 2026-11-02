---
name: agent-workflow-vn
description: >-
  Fullstack agent workflow for Vietnamese shop apps (React/Vite + Spring Boot +
  MySQL Flyway): read feature docs first, update API contract, run build/tests
  before claiming done. Use when starting a feature, finishing a task, changing
  schema/API, or when the user asks for quy trình / docs / báo cáo xong.
---

# Agent workflow (fullstack VN)

## Trước khi sửa

1. Xác định feature → đọc `docs/features/<name>.md` (Đã có / Chưa có). Không làm trùng.
2. Phạm vi BE → DTO, LAZY, Flyway migration. FE → `features/` + `shared/api`.
3. Đổi schema → migration mới, **MySQL**; không “chạy local file DB” cho shop.
4. Feature mới → copy template feature doc; cập nhật PROGRESS / API_CONTRACT nếu có.

## Trong lúc code

- Thay đổi nhỏ nhất đủ việc; không refactor ngoài phạm vi.
- Bỏ tính năng → xóa **cả BE + FE** + cập nhật docs.
- PowerShell: không dùng `&&`; dùng `;`. `mvnw.cmd` trên Windows.

## Trước khi báo xong

Không báo xong chỉ vì đã ghi file.

- [ ] FE: `npm run build` (+ lint nếu có)
- [ ] BE: test/compile liên quan; migration trên DB test tách production nếu cần
- [ ] UI đổi hành vi → kiểm tra trình duyệt / app desktop khi đụng in-backup-quit
- [ ] Docs feature / API / decision log nếu quyết định quan trọng

## Giao tiếp

- Tiếng Việt, ngắn, dẫn bằng kết luận.
- Không hỏi thừa khi đã đủ để làm.
