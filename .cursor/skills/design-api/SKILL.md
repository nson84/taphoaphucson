---
name: design-api
description: >-
  Thiết kế REST API Spring Boot cho sổ nợ (DTO, endpoint, JWT, lỗi). Dùng khi
  thêm/sửa endpoint, contract FE↔BE, hoặc auth/PIN.
---

# Design API

## Stack

- Spring Boot (`be/`), package theo feature: `auth`, `customer`, `debt`, `summary`.
- Auth: JWT Bearer; PIN riêng cho hủy trả nợ / đổi PIN.
- FE gọi qua `api()` trong `fe/src/shared/api.js` (base `/api`, gắn token).

## Quy trình

1. Định nghĩa DTO request/response rõ tên (`CreateDebtRequest`, `DebtResponse`…).
2. Endpoint REST theo resource:
   - `POST/GET/PUT /api/debts`, `POST .../pay`, `.../unpay`, `.../pay-batch`
   - `GET /api/customers`, `GET /api/customers/{id}`
   - `GET /api/summary`
   - `POST /api/auth/login`, profile/PIN dưới `/api/...`
3. Mọi mutation (trừ login) yêu cầu JWT; unpay yêu cầu PIN hợp lệ.
4. Lỗi: HTTP status rõ (400/401/403/404) + message đọc được; FE `api()` ném `Error` theo message.
5. Pagination: `page`, `size`, response có `content`, `totalPages` (Spring Page).
6. Không đổi contract cũ một cách im lặng — nếu breaking, nêu rõ và cập nhật FE cùng lúc.

## Không làm

- Không trả PoC exploit / bypass auth.
- Không hardcode secret trong response.
