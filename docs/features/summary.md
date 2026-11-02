# Feature: summary

## Mục đích

Trang chính: KPI tổng nợ + danh sách khách còn nợ; vào chi tiết khách; tạo nợ mới.

## Đã có

### Backend (`be/`)

- [x] `summary/SummaryController` — GET `/api/summary`
- [x] Lọc kind (cá nhân/công ty), sort số tiền, search `q`

### Frontend (`fe/`)

- [x] `SummaryPage` — KPI, toolbar tìm/lọc, bảng, pagination
- [x] Nút **+ Tạo nợ** → `/debts/new`
- [x] Suggest khách → `/customers/:id`
- [x] Route: `/`

## Chưa có / nợ kỹ thuật

- (trống)

## Liên quan

- Thay thế UX “Danh sách nợ” toàn cục (đã bỏ)
- UI polish scoped `.summary-*` (accent MediumBlue + font system)
