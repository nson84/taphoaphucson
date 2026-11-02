# Gói skill / docs — mang sang dự án khác

Gói này đóng gói cách làm việc từ dự án **Tạp hóa Phúc Sơn** (React + Spring Boot + MySQL + Electron Windows) để agent ở **folder dự án mới** vẫn theo cùng quy tắc.

## Cài vào dự án mới

1. Copy **cả thư mục** `.cursor` trong gói này vào **root dự án mới** (gộp nếu đã có `.cursor`):

```
du-an-moi/
  .cursor/
    skills/   ← copy từ pack này
    rules/    ← copy từ pack này
  docs/       ← (tuỳ chọn) copy thư mục docs/ trong pack
```

2. PowerShell (từ thư mục pack này):

```powershell
$dest = "D:\path\to\du-an-moi"   # sửa đường dẫn
New-Item -ItemType Directory -Force -Path "$dest\.cursor\skills" | Out-Null
New-Item -ItemType Directory -Force -Path "$dest\.cursor\rules" | Out-Null
Copy-Item -Recurse -Force ".\.cursor\skills\*" "$dest\.cursor\skills\"
Copy-Item -Recurse -Force ".\.cursor\rules\*" "$dest\.cursor\rules\"
Copy-Item -Recurse -Force ".\docs" "$dest\docs-pack-phucson" -ErrorAction SilentlyContinue
```

3. Mở dự án mới trong Cursor → chat mới → gõ `@` và chọn skill, hoặc để agent tự nhận qua `description`.

## Cài dùng chung mọi dự án (personal skills)

Copy từng skill vào:

`C:\Users\<ban>\.cursor\skills\<ten-skill>\SKILL.md`

**Không** copy vào `~\.cursor\skills-cursor\` (thư mục nội bộ Cursor).

## Có gì trong gói

| Skill | Khi nào dùng |
|:---|:---|
| `desktop-mysql-electron` | App PC Electron + MySQL local, splash, backup, build `.exe` |
| `agent-workflow-vn` | Quy trình fullstack: docs feature, Flyway, test trước khi báo xong |
| `pos-shop-ux-vn` | UX tạp hóa / POS tiếng Việt (ngày tháng, toast, biến thể hàng…) |
| `build-windows-portable` | Đóng gói Windows portable/setup, MySQL profile |

| Rule | Luôn áp? |
|:---|:---|
| `desktop-app-always.mdc` | Có — nhớ app 1 máy, không thiết kế SaaS |
| `mysql-flyway.mdc` | Khi đụng DB |
| `runnable-before-done.mdc` | Có — không báo xong nếu chưa chạy được |

## Lưu ý

- Chat cũ **không** theo sang folder mới; skill/rules mới là bộ nhớ thay thế.
- Sửa tên DB/port/user trong skill cho khớp dự án mới nếu khác `tap_hoa` / `root`/`123456`.
- Commit gói này vào repo mới nếu muốn cả team dùng chung.
