# Flow Cho Dev — Frontend

Dành cho dự án chỉ frontend, hoặc session chỉ làm phần `fe/` trong monorepo fullstack.

**Phúc Sơn:** React + Vite — `fe/src/features/`, API qua `fe/src/shared/api.js`.

---

## Phase 1: Chuẩn Bị

**Thời gian ước tính:** 1-2 giờ. Làm 1 lần duy nhất.

### Project Rules (Cursor)

`.cursor/rules/*.mdc` — nội dung cần có:

- Tech stack + versions
- Cấu trúc feature-based
- Component conventions
- **Design tokens** (primary/secondary, spacing, fonts, breakpoints) — bắt buộc để UI nhất quán
- State management pattern
- Important rules (loading/error/empty, dùng shared...)
- Decision Log

### Docs

```
docs/
├── PAGES.md            ← Danh sách pages/routes
├── API_CONTRACT.md     ← API FE sẽ gọi
└── PROGRESS.md
```

---

## Phase 2: Dựng Nền Móng

1. Project + folder feature-based
2. Setup routing (placeholder routes)
3. Shared components trước (Layout, Button, Table, Loading, Error, Empty, Modal)
4. API service layer (`shared/api.js`: token, 401 → login)
5. Mock nếu API chưa sẵn

### Checklist trước Phase 3

- [ ] `npm run dev` chạy
- [ ] Routing OK
- [ ] Shared render đúng
- [ ] Gọi được API hoặc mock
- [ ] Commit + Update PROGRESS.md

---

## Phase 3: Phát Triển Từng Feature

**1 feature = 1 page hoặc 1 flow = 1 session.**

### Vòng lặp

1. Prompt: đọc PAGES + API_CONTRACT → page/form; **bắt buộc dùng shared**; trỏ feature đã xong
2. Đọc code — AI tự tạo component mới thay shared → yêu cầu sửa
3. Test browser: happy / loading / error / empty / validation / responsive / auth guard
4. Automated test (tùy): E2E flow chính, unit cho logic phức tạp
5. Fix & refine trong session
6. Update docs + commit → đóng session

---

## Phase 4: Hoàn Thiện

- [ ] Error pages / boundary
- [ ] Responsive tất cả pages
- [ ] Loading/error/empty
- [ ] E2E flow chính (tùy)
- [ ] Build production

---

## Sai Lầm Hay Gặp

| Sai lầm | Cách tránh |
|:---|:---|
| Không shared trước | Phase 2 tạo shared trước feature |
| Không ghi design tokens | Ghi trong Project Rules |
| Bỏ loading/error/empty | Rule: mọi page phải có |
| Chỉ test desktop | 3 breakpoints trước commit |
| Không API_CONTRACT | Viết contract trước |
| AI tự tạo UI thay shared | Prompt rõ: dùng `shared/` |
