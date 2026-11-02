# Feature: cards

## Mục đích

Mua thẻ cào: shop, đơn, admin fulfill, demo pay; khóa PIN khi vào khu vực.

## Đã có

### Backend (`be/`)

- [x] `cards/CardProductController`, `CardOrderController`
- [x] VTCPay IPN/return/config

### Frontend (`fe/`)

- [x] `CardsPinGate`, `CardShopPage`, `CardOrderPage`, `CardAdminPage`, `CardDemoPayPage`
- [x] Routes dưới `/cards/**`

## Chưa có / nợ kỹ thuật

-

## Liên quan

- [payments-qr.md](payments-qr.md)
