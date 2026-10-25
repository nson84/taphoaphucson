---
name: plan-feature
description: >-
  Phân tích yêu cầu tính năng sổ nợ, chia checklist và data flow trước khi code.
  Dùng khi user muốn thêm feature, plan, hoặc chia việc cho Phúc Sơn (FE React +
  BE Spring Boot).
---

# Plan Feature

**Chỉ lên kế hoạch — không tự code** cho tới khi user đồng ý checklist (trừ khi user nói "làm luôn").

## Stack cần nhớ

- `be/`: Spring Boot, JWT, Flyway (`be/src/main/resources/db/migration/`), REST theo feature package.
- `fe/`: React + Vite, gọi API qua `fe/src/shared/api.js`.
- MySQL DB `tap_hoa`, entity chính: `customers`, `debts`, `users` (+ PIN).

## Quy trình

1. **Làm rõ yêu cầu**: phạm vi FE/BE/DB, ai dùng (admin), ràng buộc (PIN, merge tên…).
2. **Khảo sát code**: tìm controller/service/page tương tự trong `be/src/main/java` và `fe/src/features`.
3. **Data flow** (text), ví dụ:
   ```
   UI click Trả nợ → ConfirmDialog → POST /api/debts/{id}/pay → JWT → DebtService → MySQL → refresh list
   ```
4. **Checklist**: mỗi bước verify được độc lập (migration, endpoint, FE page, seed…).
5. Dừng ở plan; chờ user OK rồi mới implement.

## Output

```markdown
## Luồng dữ liệu
...

## Checklist
- [ ] ...
```
