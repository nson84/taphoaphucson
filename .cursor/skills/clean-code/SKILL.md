---
name: clean-code
description: >-
  Refactor code vừa viết trong taphoaphucson — chia nhỏ, DRY vừa phải, không đổi
  behavior. Dùng sau khi xong feature hoặc khi user nhờ dọn code.
---

# Clean Code

**Phạm vi**: chỉ diff/task hiện tại — không refactor lan sang module khác.

## Nguyên tắc

1. Không đổi behavior (API response, UI flow, PIN/JWT).
2. FE: page > ~150 dòng hoặc trộn fetch+batch+dialog → tách helper/component shared nếu lặp ≥2 chỗ (`DebtListPage` / `CustomerDetailPage`).
3. BE: giữ layer Controller → Service → Repository; không nhét business vào controller.
4. DRY có chừng mực — không abstraction cho 1 chỗ dùng.
5. Giữ convention: JS trong `fe/`, Java package feature trong `be/`.

## Quy trình

1. `git diff`
2. Liệt kê điểm cải thiện
3. Áp dụng → smoke test trang liên quan / endpoint liên quan
4. Tóm tắt ngắn những gì đã refactor
