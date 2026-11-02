# Feature: debts

## Mục đích

Tạo / sửa phiếu nợ (cá nhân & công ty); trả / mở lại nợ (PIN).

## Đã có

### Backend (`be/`)

- [x] `debt/DebtController` — CRUD, pay, pay-batch, unpay
- [x] `DebtType` PERSONAL/COMPANY; merge khách qua `CustomerMergeService`
- [x] Integration / system tests

### Frontend (`fe/`)

- [x] `DebtFormPage` — `/debts/new`, `/debts/:id/edit`
- [x] Ô **Số tiền nợ** dùng `shared/MoneyInput`: gõ 5000 → hiển thị `5,000 đ` ngay trong ô (con trỏ luôn trước " đ"); bỏ dòng preview bên dưới
- [x] Nợ từ POS: số nợ = tổng hóa đơn đã **làm tròn lên 1.000 đ** (xem `features/sales.md`)
- [x] Cảnh báo rời trang khi **đang tạo/sửa dở** (cả nợ thường, không chỉ luồng từ POS): popup Thoát / Ở lại tiếp tục tạo|sửa. Nợ từ POS giữ nguyên hành vi cũ (lưu nháp khi thoát)
- [x] Quay lại / sau lưu → Tổng hợp `/`
- [x] ~~DebtListPage~~ **đã xóa** (redirect `/debts` → `/`)

## Chưa có / nợ kỹ thuật

- List toàn cục theo phiếu: cố ý không làm lại trừ khi user yêu cầu

## Liên quan

- Chi tiết phiếu theo khách: feature `customers`
