---
name: build-ui
description: >-
  Xây/chỉnh UI React (Vite) cho app sổ nợ Phúc Sơn — CSS variables, nút màu theo
  vai trò, badge trạng thái nợ. Dùng khi tạo component mới, sửa giao diện, nút,
  bảng, form, hoặc màu trạng thái còn nợ/hết nợ.
---

# Build UI — Tạp hóa Phúc Sơn

## Stack

- Frontend: React + Vite (`fe/`), React Router, không Tailwind/shadcn.
- Style toàn cục: `fe/src/index.css` (CSS variables + class utility).
- Page theo feature: `fe/src/features/{auth,customers,debts,summary}/`.
- Shared: `fe/src/shared/` (`api.js`, `format.js`, `Layout.jsx`, `ConfirmDialog.jsx`…).
- Dev: FE `http://localhost:5173`, proxy `/api` → BE `:8080`.

## Token màu & nút (bắt buộc giữ nhất quán)

| Vai trò | Class | Ý nghĩa |
|---------|-------|---------|
| Primary | `.btn` / `button` mặc định | accent xanh (Chi tiết, Lưu…) |
| Sửa | `.btn-edit` | vàng |
| Trả nợ | `.btn-pay` | xanh success |
| Hủy trả / nguy hiểm | `.btn-cancel` / `.danger` | đỏ |
| Ghost | `.ghost` | viền nhẹ |
| Còn nợ | `.status-unpaid` + `.row-unpaid` | highlight đỏ |
| Hết nợ | `.status-paid` + `.row-paid` | highlight xanh |
| Số tiền còn nợ | `.balance-unpaid` | đỏ đậm |
| Số tiền hết nợ | `.balance-paid` | xanh đậm |

Text trạng thái khoản nợ: **Còn nợ** / **Hết nợ** trong `<span class="status-badge …">`.

## Checklist khi tạo/sửa UI

1. Tái sử dụng component/shared hiện có trước khi tạo file mới.
2. Semantic HTML: `<button>`, `<Link>`, `<table>`, label gắn input.
3. Dialog xác nhận nguy hiểm (hủy trả nợ + PIN) dùng `ConfirmDialog`.
4. Tiền: `formatMoney` từ `shared/format.js` (vd. `5.000 đ`).
5. Ngày giờ: `DateTimeCell` + datepicker locale `vi`.
6. Responsive: bảng trong `.table-wrap`, không fix width cứng không cần thiết.
7. Không thêm Tailwind/shadcn trừ khi user yêu cầu rõ.

## Sau khi sửa

- FE đã chạy thì Vite HMR cập nhật; nếu chưa: `cd fe && npm run dev`.
- Kiểm tra nhanh trang Danh sách nợ / Chi tiết khách / Tổng hợp (màu nút + badge).
---

## Không làm

- Không đổi brand/nav sang layout dashboard phức tạp.
- Không dùng emoji làm UI chính.
