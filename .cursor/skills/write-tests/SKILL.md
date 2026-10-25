---
name: write-tests
description: >-
  Viết test cho sổ nợ: FE (Vitest + RTL nếu đã cài) hoặc BE (Spring tests). Dùng
  khi user yêu cầu test component, service, API.
---

# Write Tests

## Hiện trạng

- FE (`fe/`) có thể chưa có Vitest — nếu thiếu, hỏi trước khi cài dependency.
- BE: ưu tiên `@SpringBootTest` / `@WebMvcTest` / service unit test theo module đang đụng.

## Nguyên tắc

1. Test hành vi, không test implementation detail.
2. Happy path + edge (PIN sai → 403, nợ đã trả không sửa…).
3. FE: query theo role/label; mock `api`/`fetch` ở boundary.
4. BE: không cần MySQL thật nếu dùng slice test + mock; integration thì dùng testcontainers/profile nếu đã có.

## Sau khi viết

Chạy test tương ứng (`mvn test` / `npm test`) và báo kết quả.
