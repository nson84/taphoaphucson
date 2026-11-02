# Feature: customers

## Mục đích

Danh sách / chi tiết khách; sổ phiếu nợ theo khách; trả nợ, QR, sửa khách.

## Đã có

### Backend (`be/`)

- [x] `customer/CustomerController` — CRUD, debts theo khách, pay-amount
- [x] Suggest `nameOnly`, filter personal/company
- [x] `CustomerMergeService` — công ty Chủ / Nhân viên

### Frontend (`fe/`)

- [x] `CustomerListPage`, `CustomerDetailPage`
- [x] Routes: `/customers`, `/customers/:id`
- [x] Chi tiết: list nợ, trả, sửa, tạo nợ, QR…
- [x] Sổ nợ (còn nợ / đã trả): mặc định xếp theo ngày mới → cũ (`dateDesc`); nút đảo chiều ngày; BE `AmountSort.debtPageable` hỗ trợ `dateDesc`/`dateAsc` (vẫn nhận `amountDesc`/`amountAsc`)

## Chưa có / nợ kỹ thuật

-

## Liên quan

- Từ Tổng hợp bấm Chi tiết → vào đây
