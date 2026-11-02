# Audit mã vạch (từ Excel KiotViet)

## Kết quả phân loại (DB hiện tại ~7132 SP)

| Nhóm | Số lượng | Ý nghĩa |
|------|----------|---------|
| Mã ảo / nội bộ | **467** | `SP…`, `QM…`, không phải EAN/UPC |
| Ứng viên mã vạch số (8/12/13/14 số) | **6665** | Có thể quét được, chưa chắc có trên web quốc tế |
| Tên hàng “bẩn” (mẫu) | **13+** | Tên kiểu `---893…`, chỉ số tiền `10k`, trùng mã |

File CSV:
- `fake-or-internal-codes.csv` — liệt kê mã ảo
- `ean-candidates.csv` — hàng có mã dạng EAN
- `weird-names.csv` — tên nghi ngờ
- `off-vn-sample-40.csv` — mẫu 40 mã VN `893…` tra Open Food Facts (1/40 có)

## Web / API tra tên theo mã vạch

1. **Open Food Facts** (miễn phí, thực phẩm): https://world.openfoodfacts.org  
   API: `https://world.openfoodfacts.org/api/v2/product/{barcode}.json`  
   Ví dụ Nutella: mã `3017620422003` → tìm thấy. Nhiều mã VN `893…` **không có** trong DB cộng đồng.
2. **Open Beauty Facts** (mỹ phẩm): https://world.openbeautyfacts.org  
3. Tra tay trên web: dán mã vào ô tìm Open Food Facts / Google `"mã" tên sản phẩm`.

Lưu ý: không có DB công miễn phí nào cover đủ tạp hóa Việt Nam. Chuẩn hóa tên chủ yếu vẫn dựa KiotViet + sửa tay / quét lại tại quầy.

## Trên app (MySQL `tap_hoa`)

Trang **Hàng hóa** có bộ lọc **Mã ảo / nội bộ** và **Mã vạch thật**. Mã thật = GTIN 8/12/13/14 số **đúng chữ số kiểm tra**; còn lại (SP…, QM…, sai checksum) là mã ảo. Sau khi import lại vào MySQL: 7181 hàng, 6606 mã thật, 575 mã ảo.

Nút **Gợi ý tên** (chỉ hiện với mã thật) tra Open Food Facts → Open Beauty Facts → Open Products Facts, cho sửa rồi **Áp dụng**.

## Profile DB

- Dev & desktop: **MySQL** `tap_hoa` + Flyway (`.\mvnw.cmd spring-boot:run`, Electron `--spring.profiles.active=mysql`).
- H2 chỉ còn trong **test** in-memory — không dùng để audit/import hàng thật.
