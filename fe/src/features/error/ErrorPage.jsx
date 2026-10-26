import { Link } from 'react-router-dom'
import './error.css'

const COPY = {
  401: {
    title: 'Chưa đăng nhập',
    desc: 'Phiên làm việc đã hết hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại để tiếp tục.',
    primary: { to: '/login', label: 'Đăng nhập' },
    secondary: { to: '/', label: 'Về trang chủ' },
  },
  403: {
    title: 'Không có quyền truy cập',
    desc: 'Bạn không được phép xem trang hoặc thực hiện thao tác này.',
    primary: { to: '/', label: 'Về trang chủ' },
    secondary: { to: '/login', label: 'Đăng nhập lại' },
  },
  404: {
    title: 'Không tìm thấy trang',
    desc: 'Đường dẫn không đúng hoặc trang đã bị gỡ. Kiểm tra lại địa chỉ bạn vừa nhập.',
    primary: { to: '/', label: 'Về trang chủ' },
    secondary: { to: '/debts', label: 'Danh sách nợ' },
  },
  500: {
    title: 'Lỗi máy chủ',
    desc: 'Hệ thống gặp sự cố tạm thời. Thử lại sau vài giây hoặc quay về trang chủ.',
    primary: { to: '/', label: 'Về trang chủ' },
    secondary: null,
  },
}

export default function ErrorPage({ code = 404 }) {
  const key = String(code)
  const meta = COPY[key] || COPY['404']

  return (
    <section className="error-page">
      <div className="error-card" data-code={key}>
        <p className="error-brand">Tạp hóa Phúc Sơn</p>
        <p className="error-code" aria-hidden="true">
          {key}
        </p>
        <h1 className="error-title">{meta.title}</h1>
        <p className="error-desc">{meta.desc}</p>
        <div className="error-actions">
          <Link className="btn" to={meta.primary.to}>
            {meta.primary.label}
          </Link>
          {meta.secondary && (
            <Link className="btn ghost" to={meta.secondary.to}>
              {meta.secondary.label}
            </Link>
          )}
          {key === '500' && (
            <button type="button" className="ghost" onClick={() => window.location.reload()}>
              Thử lại
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
