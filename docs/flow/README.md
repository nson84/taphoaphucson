# Flow Cho Dev (Cursor)

Hướng dẫn làm việc với AI trong Cursor. Đã đổi tên từ Claude → Cursor (`.cursor/rules`, không dùng `CLAUDE.md`).

| File | Khi nào đọc |
|:---|:---|
| [flow-dev-overview.md](flow-dev-overview.md) | Tổng quan 3 loại dự án |
| [flow-dev-fullstack.md](flow-dev-fullstack.md) | **Phúc Sơn** — BE + FE |
| [flow-dev-backend.md](flow-dev-backend.md) | Session chỉ `be/` |
| [flow-dev-frontend.md](flow-dev-frontend.md) | Session chỉ `fe/` |

Rules Cursor tương ứng:

- `.cursor/rules/flow-dev.mdc` (always apply)
- `.cursor/rules/feature-docs.mdc` (always apply — mỗi feature một file theo dõi)
- `.cursor/rules/flow-dev-backend.mdc` (`be/**`)
- `.cursor/rules/flow-dev-frontend.mdc` (`fe/**`)

Docs vận hành dự án (Phase 1):

- `docs/PAGES.md`, `docs/API_CONTRACT.md`, `docs/PROGRESS.md`, `docs/DECISION_LOG.md`
- `docs/features/*.md` — đã có gì / chưa có gì theo từng feature
