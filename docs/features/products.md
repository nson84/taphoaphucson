# Feature: products

## Mục đích

Quản lý hàng hóa tạp hóa: mã vạch, tên, nhóm (optional), giá vốn/bán, tồn, **nhiều đơn vị tính** (gói/thùng/lốc) — POS chọn ĐVT khi bán.

## Đã có

### Backend (`be/`)

- [x] Package `product/` — entity, repo, service, controller
- [x] API: `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}`, `GET /api/products/by-barcode/{code}`
- [x] Flyway V8 `products`, V9 `category` + `product_units` + sale_items unit fields
- [x] Checkout trừ tồn = `qty × unit.factor`
- [x] Integration tests (`ProductBarcodeCheckApiIntegrationTest`)
- [x] Hàng không mã vạch: `has_physical_barcode=false` (Flyway V17); tạo với `barcode` trống hoặc `POST /api/products/quick`; mã nội bộ EAN-13 đầu 29; lọc `codeType=nobarcode`; chống trùng tên
- [x] Ảnh sản phẩm: cột `image_filename`; file dưới `${TAPHOA_DATA_DIR}/product-images/` (desktop = `userData/data/product-images`); API POST/GET/DELETE `/{id}/image`; FE `ProductThumb` + form upload
- [x] **Biến thể kiểu dáng / màu sắc** (Flyway V18 `product_variants`): cùng tên+nhóm; mỗi kiểu có ảnh riêng; `sellPrice`/`costPrice` null = dùng giá chung; API ảnh `/{id}/variants/{variantId}/image`; form «Kiểu dáng / màu sắc»; POS không mã vạch hiện từng kiểu; hóa đơn snapshot `variant_name` + tên «Hàng — Kiểu»
- [x] Giá bán (cơ bản + ĐVT) phải bội 500đ — BE `MoneyRules`, FE form ±500; giá vốn tự do
- [x] `ProductDto`: `hasPhysicalBarcode`, `hasImage`, `variants`
- [x] Chặn trùng mã vạch/mã hàng khi tạo/sửa (400) + `GET /api/products/barcode-check?code=&excludeId=` → `{exists, productId, name, barcode, active}` (tính cả mã phụ và hàng đã ngừng bán) để cảnh báo sớm
- [x] `POST /api/products/fake-codes/delete` — xóa hẳn mã ảo khỏi DB (detach `sale_items.product_id`); hóa đơn giữ snapshot tên/mã

### Frontend (`fe/`)

- [x] `ProductListPage` — `/products` (mã, tên, nhóm, giá, tồn, ĐVT); ô tìm có **dropdown gợi ý** theo tên/mã vạch khi **gõ tay** (bấm → sửa hàng). Máy quét (kể cả chưa click ô tìm): khớp mã thì **mở thẳng** `/products/:id/edit`, không xổ gợi ý
- [x] `ProductFormPage` — barcode, tên, nhóm, giá, tồn, đơn vị cơ bản + thêm đơn vị quy đổi
- [x] `ProductFormPage` — **cảnh báo trùng mã vạch ngay khi nhập** (sau ~0,45s, khi rời ô, khi máy quét Enter, và trước khi lưu): popup «Mã vạch này đã có hàng hóa …» với nút **Tới sản phẩm này** (mở trang sửa sản phẩm đó) / **Nhập mã khác**; cảnh báo còn hiện dưới ô mã vạch, không lưu được khi còn trùng
- [x] `useLeaveGuard` (shared) — đang **tạo/sửa dở** mà đổi trang (menu, nút quay lại, đóng tab) → popup «Bạn có muốn thoát không?»: **Thoát** hoặc **Ở lại tiếp tục tạo/sửa**. Không hỏi khi chưa nhập gì / sửa chưa đổi / vừa lưu xong. Dùng cho hàng hóa và khoản nợ
- [x] POS: dropdown ĐVT trên dòng hàng → đổi giá
- [x] Nav **Hàng hóa**

## Chưa có / nợ kỹ thuật

- Thương hiệu / thuộc tính nâng cao
- Tồn kho riêng theo từng biến thể
- Phiếu kiểm kho / nhập NCC đầy đủ

## Liên quan

- API: `docs/API_CONTRACT.md` § Products
- Sales/POS: feature `sales`
