# Feature: payments-qr

## Mục đích

QR trả nợ khách + cấu hình ngân hàng; thanh toán VTCPay cho đơn thẻ.

## Đã có

### Backend (`be/`)

- [x] `qr/DebtQrController`, `ShopQrConfigController`
- [x] `payment/VtcPayController`

### Frontend (`fe/`)

- [x] QR trên chi tiết khách / settings bank QR
- [x] Flow thẻ dùng VTCPay (partial UX)

## Chưa có / nợ kỹ thuật

- Đồng bộ docs chi tiết request body khi đổi gateway

## Liên quan

- customers, cards, settings
