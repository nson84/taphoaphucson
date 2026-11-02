# Checklist app PC (copy sang dự án mới)

Dùng khi sản phẩm là **Electron + BE + MySQL trên 1 máy**.

## Kiến trúc

- [ ] BE đóng gói jar; desktop spawn với profile **mysql**
- [ ] JRE bundled (máy shop không cần cài Java)
- [ ] `TAPHOA_DATA_DIR` / `userData/data` cho ảnh & file ngoài jar
- [ ] Backend bind `127.0.0.1` (không lộ LAN nếu không cần)

## Splash / âm thanh

- [ ] Ảnh splash `object-fit: contain` (tránh video codec lỗi trên Portable)
- [ ] Nhạc chờ (mp3) tách khỏi video nếu cần
- [ ] Lời chào sau khi UI load; lời tạm biệt khi quit (chờ phát xong)

## Backup

- [ ] Thư mục mặc định cố định trên đĩa (vd. `D:\...`)
- [ ] Desktop ghi file vào thư mục đó (IPC), không mặc định Downloads
- [ ] Dialog thoát: tắt không lưu / lưu rồi tắt / ở lại

## Trước phát hành

- [ ] `npm run dist` / script build thành công
- [ ] Thử Portable trên máy có MySQL
- [ ] Ảnh hàng hiện đúng (AppData đã có file hoặc user upload lại)
