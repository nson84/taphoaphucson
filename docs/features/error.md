# Feature: error

## Mục đích

Trang lỗi thân thiện; redirect 401 → login (không kẹt error page khi logout).

## Đã có

### Frontend (`fe/`)

- [x] Unauthorized / Forbidden / NotFound / ServerError + `ErrorPage`
- [x] `api.js`: 401 → `/login`; skip redirect trên login/logout; 403 không đè logout
- [x] Routes `/error/*`

### Backend

- [x] SPA forward + permit `/error/**`

## Chưa có / nợ kỹ thuật

-

## Liên quan

- auth logout flow
