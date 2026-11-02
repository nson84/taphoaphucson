# Flow Cho Dev — Backend

Dành cho dự án chỉ có backend (REST API), hoặc session chỉ làm phần `be/` trong monorepo fullstack.

**Phúc Sơn:** Java / Spring Boot / MySQL / Flyway / JWT — code trong `be/`.

---

## Phase 1: Chuẩn Bị

**Thời gian ước tính:** 1-2 giờ. Làm 1 lần duy nhất.

### Project Rules (Cursor)

File AI đọc tự động: `.cursor/rules/*.mdc` (globs `be/**` hoặc alwaysApply). Nội dung cần có:

- Tech stack + versions (Java, Spring Boot, MySQL...)
- Cấu trúc project (feature-based package)
- Naming conventions (Entity, DTO, Controller, API path)
- Response format (error format, pagination)
- Important rules (không EAGER mặc định, luôn DTO, luôn có test...)
- Decision Log

**Mẹo:** Thêm **code example cụ thể** vào rules — AI follow example tốt hơn mô tả chung.

### Docs

```
docs/
├── DATABASE.md      ← Entity, quan hệ, fields
├── API_SPEC.md      ← Danh sách API (method + path + mô tả + quyền)
│   hoặc API_CONTRACT.md khi fullstack
└── PROGRESS.md      ← Tracking tiến độ
```

---

## Phase 2: Dựng Nền Móng

1. Tạo project + cấu trúc folder feature-based — build/chạy được
2. Tạo TẤT CẢ entities / migration cùng lúc (quan hệ phụ thuộc lẫn nhau)
3. Seed fake data
4. Setup công cụ test API (Postman / Swagger)

### Checklist trước Phase 3

- [ ] Project chạy được
- [ ] Entities/migration đúng quan hệ
- [ ] Database có fake data
- [ ] Git commit setup + Update PROGRESS.md

---

## Phase 3: Phát Triển Từng Feature

**1 feature = 1 nhóm API = 1 session Cursor.**

### Vòng lặp

1. **Prompt:** đọc API contract/spec + DATABASE → Controller, Service, DTO; trỏ feature đã xong làm mẫu
2. **Đọc hiểu code** — sai convention → sửa + ghi rules
3. **Test thủ công:** happy path, validation 400, 401, 403, 404
4. **Automated test:** unit Service + integration Controller; chạy cả suite (regression)
5. **Fix trong cùng session**
6. Update PROGRESS + Decision Log + commit → **đóng session**

---

## Phase 4: Hoàn Thiện

- [ ] Global exception / error handling
- [ ] Full regression
- [ ] Security review (password, token, phân quyền)
- [ ] Performance (N+1, index)
- [ ] Build production

---

## Sai Lầm Hay Gặp

| Sai lầm | Cách tránh |
|:---|:---|
| Code không có docs | Phase 1 trước |
| Nhiều feature / 1 session | 1 feature = 1 session |
| Không test trước khi tiếp | Test + regression trước commit |
| Return entity (leak data) | Luôn DTO |
| EAGER everywhere | LAZY mặc định |
| Tin AI 100% với security | Hiểu + verify |
