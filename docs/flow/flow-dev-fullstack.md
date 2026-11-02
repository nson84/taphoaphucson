# Flow Cho Dev — Fullstack

Dành cho dự án có cả backend và frontend, do 1 người làm. Đây là trường hợp phức tạp nhất vì bạn quản lý 2 codebase cùng lúc.

Điểm khác biệt lớn nhất so với backend-only hoặc frontend-only: **bạn cần một "giao kèo" giữa 2 phía — API Contract.** Không có nó, BE trả format A mà FE expect format B → debug mệt mỏi.

**Áp dụng cho Tạp hóa Phúc Sơn** (`be/` Spring Boot + `fe/` React/Vite).

---

## Phase 1: Chuẩn Bị

**Thời gian ước tính:** 2-3 giờ. Làm 1 lần duy nhất.

### Cấu trúc project

```
# Monorepo (solo) — cấu trúc Phúc Sơn
taphoaphucson/
├── .cursor/
│   ├── rules/             ← Project rules (*.mdc) — Cursor đọc tự động
│   └── skills/            ← Agent skills
├── docs/
│   ├── flow/              ← Flow phát triển (file này)
│   ├── API_CONTRACT.md    ← File quan trọng nhất (nên có)
│   ├── DATABASE.md
│   ├── PAGES.md
│   └── PROGRESS.md
├── be/                    ← Spring Boot
└── fe/                    ← React + Vite
```

### Project Rules (Cursor)

**Phần Backend** (`.cursor/rules/` + globs `be/**`):
- Tech stack + versions (Java, Spring Boot, MySQL...)
- Cấu trúc folder feature-based
- Naming conventions, response format, DTO pattern
- Important rules (LAZY, DTO, test...)

**Phần Frontend** (`.cursor/rules/` + globs `fe/**`):
- Tech stack + versions (React, Vite...)
- Cấu trúc folder feature-based (`fe/src/features/`)
- Component conventions, design tokens
- Important rules (shared components, loading/error/empty state...)

**Phần chung** (`alwaysApply`):
- Quy ước giao tiếp FE ↔ BE (base URL, auth header, error format)
- Decision Log / flow session

### Docs

| File | Vai trò |
|:---|:---|
| `docs/API_CONTRACT.md` | **Quan trọng nhất.** Request/response format cho từng API |
| `docs/DATABASE.md` | Entity, quan hệ, fields |
| `docs/PAGES.md` | Danh sách pages/routes |
| `docs/PROGRESS.md` | Tracking tiến độ cả BE và FE |

Khi thay đổi 1 API: update contract trước → sửa BE → sửa FE.

---

## Phase 2: Dựng Nền Móng

Fullstack cần dựng nền móng **cả 2 phía**, sau đó **test kết nối ngay**.

### Backend

1. Tạo project + cấu trúc folder feature-based
2. Tạo TẤT CẢ entities cùng lúc (dựa vào DATABASE.md)
3. Seed fake data / Flyway migration
4. Setup Swagger (nếu dùng)
5. Config CORS (cho phép frontend gọi)

### Frontend

1. Tạo project + cấu trúc folder feature-based
2. Setup routing — tạo tất cả routes (trỏ đến placeholder)
3. Tạo shared components (Layout, Button, Table, Loading, ErrorMessage...)
4. Setup API client (`fe/src/shared/api.js` — base URL trỏ đến backend)

### Test kết nối FE ↔ BE

Bước **bắt buộc** trước Phase 3:

- [ ] CORS config đúng — FE gọi BE không bị block
- [ ] API call thành công — response đúng format
- [ ] Console không có CORS / network error

### Checklist trước khi sang Phase 3

- [ ] Backend chạy, database có data
- [ ] Frontend chạy, routing hoạt động
- [ ] FE gọi được ít nhất 1 API của BE
- [ ] Git commit: *"Initial project setup — BE + FE connected"*
- [ ] Update PROGRESS.md

---

## Phase 3: Phát Triển Từng Feature

### Cách khuyến nghị — Backend trước, Frontend sau

```
Session 1: BE — Auth API + test
Session 2: FE — Auth UI + kết nối API
Session 3: BE — Feature X API + test
Session 4: FE — Feature X UI + kết nối API
...
```

Tách sub-session: không nhồi cả BE + FE vào một session Cursor.

### Vòng lặp

#### Session BE

```
Đọc docs/API_CONTRACT.md phần [X] và docs/DATABASE.md phần [X].
Tạo feature [X] trong be/... :
- Controller, Service, DTO theo contract
Tham khảo [feature trước] cho coding style. Viết test.
```

Commit: `feat(be): complete [feature] API with tests`

#### Session FE

```
Đọc docs/API_CONTRACT.md phần [X] và docs/PAGES.md phần [X].
Tạo feature [X] trong fe/src/features/[X]/
- ListPage + FormPage (hoặc page tương ứng)
- Dùng shared từ fe/src/shared/
- API đã sẵn sàng
Tham khảo [feature trước] cho coding style.
```

Commit: `feat(fe): complete [feature] UI`

#### Sau khi xong cả BE + FE

- BE: automated test pass
- FE: browser — list → create → edit → delete
- Không break feature cũ
- Update PROGRESS.md → Đóng session

---

## Phase 4: Hoàn Thiện

### Backend

- [ ] Error handling tổng thể
- [ ] Security review
- [ ] Performance (N+1, index)
- [ ] Full regression test

### Frontend

- [ ] Error / 401 / 403 / 404 pages
- [ ] Responsive
- [ ] Loading/error/empty states
- [ ] E2E flow chính (tùy dự án)

### Chung

- [ ] CORS production (không wildcard `*`)
- [ ] Auth end-to-end (login → protected → logout)
- [ ] Build production cả 2 phía

---

## Sai Lầm Hay Gặp

| Sai lầm | Cách tránh |
|:---|:---|
| Không có API_CONTRACT.md | Viết contract trước, cả 2 phía follow |
| Nhồi cả BE + FE vào 1 session | Tách: 1 session BE, 1 session FE |
| Không test kết nối sớm | Phase 2: test FE ↔ BE ngay |
| CORS "tạm" rồi quên | Config đúng từ đầu, review Phase 4 |
| Sửa API không update contract | Update contract → BE → FE |
| Fix cả 2 phía cùng lúc, commit lộn | Tách `feat(be):` và `feat(fe):` |
