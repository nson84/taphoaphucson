# Quy tắc dự án Tạp hóa Phúc Sơn

## Hoàn thành công việc

Sau khi viết/sửa code, **chỉ được báo hoàn thành khi đã chạy được thật**:

1. Build / khởi động phần liên quan (backend, frontend, hoặc cả hai tùy thay đổi).
2. Gọi API hoặc mở đúng màn hình bị ảnh hưởng và xác nhận không còn lỗi.
3. Nếu có test tự động liên quan, chạy và đảm bảo pass (trừ lỗi sẵn có không thuộc phạm vi sửa).
4. Không báo “xong” chỉ vì code đã viết — phải có bằng chứng chạy được (lệnh, HTTP 200, UI không lỗi).

Nếu không chạy được: ghi rõ lỗi, nguyên nhân, và cách xử lý tiếp — **không** đánh dấu hoàn thành.
