---
name: make-commit
description: >-
  Soạn commit message / PR description từ git diff của taphoaphucson. Dùng khi
  user hỏi commit gì, viết message, hoặc mô tả PR.
---

# Make Commit

## Quy tắc

1. Đọc `git status` + `git diff` (staged/unstaged) — không đoán.
2. Conventional Commits: `feat|fix|chore|refactor|docs|test|perf|style: …`
3. Mặc định **tiếng Việt** sau `type:` (vd. `feat: thêm badge trạng thái còn nợ`), trừ khi user chọn tiếng Anh.
4. Body giải thích **why** nếu cần.
5. PR: `## Summary` + `## Test plan`.
6. **Không** `git commit` / `git push` trừ khi user yêu cầu rõ.

Không commit `.env`, password, JWT secret.
