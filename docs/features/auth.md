# Feature: auth

## Mục đích

Đăng nhập JWT, đăng xuất, PIN hồ sơ (trả nợ / mua thẻ / cài đặt).

## Đã có

### Backend (`be/`)

- [x] `auth/AuthController`, `JwtService`, `JwtAuthFilter`, `SecurityConfig`
- [x] `auth/ProfileController` — verify/đổi PIN
- [x] POST `/api/auth/login`, `/api/auth/logout` (logout permitAll)
- [x] JWT hết hạn **36 giờ** (`app.jwt.expiration-ms=129600000`); mỗi lần đăng nhập cấp token mới → đếm lại 36 giờ từ lúc login
- [x] Integration tests auth
- [x] `AttemptLimiter` (in-memory): sai 5 lần liên tiếp → **429** trong 1 phút. Áp dụng cho login (`login:<user>`), PIN (`pin:<user>`); thành công thì reset
- [x] `JwtService` cảnh báo log khi dùng secret mặc định; app desktop luôn sinh secret ngẫu nhiên (`userData/jwt-secret.txt`) và bind `127.0.0.1`
- [x] `SecurityConfig` permit `/favicon.png`, `/login-bg.jpg` (trước đây 401 trên trang login)

### Frontend (`fe/`)

- [x] `LoginPage` — popup ~80%, nền ảnh, eye password, accent MediumBlue
- [x] `AuthContext` — login/logout (xóa token trước khi gọi logout API)
- [x] `SettingsPage` — đổi PIN (+ backup/QR thuộc settings)
- [x] Routes: `/login`, `/settings`

## Chưa có / nợ kỹ thuật

- Refresh token / hết hạn JWT UX tinh chỉnh (hiện 401 → `/login`)
- Tài khoản mặc định `admin/admin123` chưa có luồng bắt đổi lần đầu (cần quyết định của chủ shop)

## Liên quan

- API: `API_CONTRACT.md` § Auth
- Decision: logout không hiện trang 401/403
