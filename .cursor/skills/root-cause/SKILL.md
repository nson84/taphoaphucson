---
name: root-cause
description: >-
  Truy root cause bug/log của app sổ nợ (FE Vite, BE Spring, MySQL, JWT/PIN).
  Dùng khi user báo lỗi, dán stack trace, hoặc behavior lạ.
---

# Root Cause Analysis

**Ưu tiên giải thích nguyên nhân** trước khi sửa (trừ khi user nói "sửa luôn").

## Quy trình

1. Thu thập: message/stack, bước repro, FE hay BE, status HTTP.
2. Định vị file/dòng; đọc context (controller, `api.js`, Flyway, proxy Vite).
3. Checklist môi trường thường gặp:
   - BE chưa lên → Vite `http proxy error` / ECONNREFUSED `:8080`
   - MySQL tắt / sai pass `application.properties`
   - JWT hết hạn / 401 → login lại
   - PIN sai → 403 unpay
   - UTF-8 hỏng → xem charset connection + cách insert
4. Truy "tại sao" tới nguyên nhân gốc, không dừng ở triệu chứng.
5. Đề xuất hướng vá + trade-off; sửa khi user OK hoặc đã yêu cầu sửa.

Không kết luận "flaky" khi chưa loại trừ nguyên nhân deterministic.
