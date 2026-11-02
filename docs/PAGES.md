# PAGES — Routes FE

Nguồn sự thật cho màn hình. Cập nhật khi thêm/đổi/xóa route.

| Path | Page | Auth | Feature doc |
|:---|:---|:---|:---|
| `/login` | LoginPage | public | [features/auth.md](features/auth.md) |
| `/` | SummaryPage | private | [features/summary.md](features/summary.md) |
| `/debts` | → redirect `/` | private | (đã bỏ DebtListPage) |
| `/debts/new` | DebtFormPage (tạo) | private | [features/debts.md](features/debts.md) |
| `/debts/:id/edit` | DebtFormPage (sửa) | private | [features/debts.md](features/debts.md) |
| `/customers` | CustomerListPage | private | [features/customers.md](features/customers.md) |
| `/customers/:id` | CustomerDetailPage | private | [features/customers.md](features/customers.md) |
| `/trash` | TrashPage | private | [features/trash.md](features/trash.md) |
| `/settings` | SettingsPage | private | [features/settings.md](features/settings.md) |
| `/pos` | PosPage | private | [features/sales.md](features/sales.md) |
| `/products` | ProductListPage | private | [features/products.md](features/products.md) |
| `/products/new` | ProductFormPage (tạo) | private | [features/products.md](features/products.md) |
| `/products/:id/edit` | ProductFormPage (sửa) | private | [features/products.md](features/products.md) |
| `/sales` | SaleListPage | private | [features/sales.md](features/sales.md) |
| `/sales/report` | SaleReportPage | private | [features/sales.md](features/sales.md) |
| `/sales/:id` | SaleDetailPage | private | [features/sales.md](features/sales.md) |
| `/cards` | CardShopPage (+ PIN gate) | private | [features/cards.md](features/cards.md) |
| `/cards/admin` | CardAdminPage | private | [features/cards.md](features/cards.md) |
| `/cards/orders/:reference` | CardOrderPage | private | [features/cards.md](features/cards.md) |
| `/cards/demo-pay/:reference` | CardDemoPayPage | private | [features/cards.md](features/cards.md) |
| `/error/401` | UnauthorizedPage | public | [features/error.md](features/error.md) |
| `/error/403` | ForbiddenPage | public | [features/error.md](features/error.md) |
| `/error/404` | NotFoundPage | public | [features/error.md](features/error.md) |
| `/error/500` | ServerErrorPage | public | [features/error.md](features/error.md) |

**Nav chính:** Tổng hợp (`/`), Bán hàng (`/pos`), Hàng hóa (`/products`), Mua thẻ (`/cards`). Lịch sử bán / báo cáo trong POS hoặc menu. Thùng rác + Cài đặt trong menu user.
