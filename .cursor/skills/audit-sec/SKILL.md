---
name: audit-sec
description: >-
  Audit bảo mật nhanh cho sổ nợ: JWT, PIN, XSS, SQL injection, lộ secret. Dùng
  khi user yêu cầu security review hoặc trước khi merge code nhạy cảm.
---

# Security Audit

Quét diff/code liên quan — không audit toàn repo trừ khi được yêu cầu.

## Checklist (áp dụng dự án)

### Auth
- Endpoint ngoài login phải qua JWT filter.
- Unpay / đổi PIN: bắt buộc verify PIN; không lộ PIN trong log/response.
- Password/PIN hash (BCrypt) — không lưu plaintext.

### Injection
- JPA/parameterized query; không nối SQL từ input user.
- Validate amount, date, name length ở BE.

### XSS
- React escape mặc định; tránh `dangerouslySetInnerHTML` với input user.

### Secrets
- `application.properties` / `.env` không commit secret production.
- JWT secret, DB password không hardcode vào FE.

## Output

Finding theo Critical/High/Medium/Low: file:line, mô tả, kịch bản, hướng fix.
Không đưa PoC tấn công / hướng dẫn tấn công chi tiết.
