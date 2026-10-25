---
name: design-db
description: >-
  Thiết kế schema MySQL + Flyway cho sổ nợ Phúc Sơn. Dùng khi thêm bảng/cột,
  quan hệ, index, hoặc migration.
---

# Design DB

## Stack

- MySQL 8, DB `tap_hoa`, charset `utf8mb4`.
- Migration: Flyway tại `be/src/main/resources/db/migration/` (`V1__init.sql`, `V2__user_pin.sql`…).
- JPA entities map tới `customers`, `debts`, `users`.

## Entity hiện có (tóm tắt)

- `customers`: name, note, timestamps — merge theo tên khi tạo nợ.
- `debts`: customer_id FK CASCADE, amount, product_note, customer_note, occurred_at, paid, paid_at.
- `users`: username, password_hash, pin (V2).

## Quy trình

1. Liệt kê entity/field/nullable từ yêu cầu.
2. Quan hệ: 1-n customer→debts; cân nhắc `ON DELETE CASCADE` vs Restrict.
3. Index: filter/sort thường dùng (`name`, `occurred_at`, `paid`, `customer_id`).
4. Viết migration mới `V{n}__*.sql` — không sửa migration đã apply trên DB thật.
5. Cập nhật entity/repo/service tương ứng.
6. **Không chạy migrate phá dữ liệu** trừ khi user yêu cầu; local `spring-boot:run` tự Flyway.

## Output

- File SQL migration + ghi chú ảnh hưởng dữ liệu hiện có.
