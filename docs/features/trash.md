# Feature: trash

## Mục đích

Khách hết nợ vào thùng rác; giữ ~60 ngày rồi dọn.

## Đã có

### Backend (`be/`)

- [x] `trash/TrashController` — GET `/api/trash`
- [x] `TrashCleanupJob`, backfill runner

### Frontend (`fe/`)

- [x] `TrashPage` — menu user → Thùng rác
- [x] Route: `/trash`

## Chưa có / nợ kỹ thuật

-

## Liên quan

- Summary chỉ hiện khách còn nợ
