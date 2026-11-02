# Quy tắc dự án Tạp hóa Phúc Sơn

## Quy trình đầy đủ (Agent / Dev)

→ **[docs/AGENT_WORKFLOW.md](docs/AGENT_WORKFLOW.md)** — đọc rules BE/FE, feature `docs/features/*.md`, test, MCP DevTools, cập nhật docs.

→ **[docs/DESKTOP_APP_REQUIREMENTS.md](docs/DESKTOP_APP_REQUIREMENTS.md)** — **bắt buộc đọc trước mỗi chức năng**: app PC (Electron), 1 máy quầy, MySQL local, nháp POS, in desktop.

Cursor rules: `.cursor/rules/desktop-app-requirements.mdc`, `agent-workflow.mdc`, `flow-dev.mdc`, `feature-docs.mdc`, `runnable-before-done.mdc`.

## Hoàn thành công việc (tóm tắt)

Sau khi viết/sửa code, **chỉ được báo hoàn thành khi đã chạy được thật**:

1. Đã đọc `docs/features/<name>.md` (và PROGRESS/API/PAGES nếu liên quan).
2. Build / test: `fe` → `npm run build` (+ lint); `be` → `.\mvnw.cmd test`.
3. Gọi API hoặc mở màn hình bị ảnh hưởng (ưu tiên Chrome DevTools MCP khi kiểm UI).
4. Cập nhật feature doc + PROGRESS/API/PAGES nếu hành vi hoặc contract đổi.
5. Không báo “xong” chỉ vì code đã viết — phải có bằng chứng (output lệnh, không lỗi console/runtime).

Nếu không chạy được: ghi rõ lỗi và bước tiếp theo — **không** đánh dấu hoàn thành.
