import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

function EyeIcon({ open }) {
  if (open) {
    return (
      <svg className="auth-eye-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
        <path
          d="M3 3l18 18M10.6 10.7a2.5 2.5 0 0 0 3.5 3.5M9.9 5.3A10.4 10.4 0 0 1 12 5c5.2 0 9.3 3.2 11 7-.5 1.2-1.3 2.3-2.3 3.3M6.7 6.7C4.5 8 2.9 9.8 2 12c1.7 3.8 5.8 7 11 7 1.5 0 2.9-.3 4.2-.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )
  }
  return (
    <svg className="auth-eye-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
      <path
        d="M2 12c1.7-3.8 5.8-7 11-7s9.3 3.2 11 7c-1.7 3.8-5.8 7-11 7S3.7 15.8 2 12z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export default function LoginPage() {
  const { login, resetLocalSession } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin123')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Token cũ/hết hạn vẫn khiến isAuthenticated=true → trước đây đá về / rồi API 403
  useEffect(() => {
    resetLocalSession()
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-card-hero" aria-hidden="true">
          <div className="auth-card-hero-photo" />
          <div className="auth-badge">
            <span className="auth-badge-title">Phúc Sơn</span>
            <span className="auth-badge-sub">Tạp hóa</span>
          </div>
        </div>

        <div className="auth-card-body">
          <label className="auth-field">
            <span className="auth-label">Tài khoản</span>
            <div className="auth-underline-wrap">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="Nhập tài khoản"
              />
            </div>
          </label>

          <label className="auth-field">
            <span className="auth-label">Mật khẩu</span>
            <div className="auth-underline-wrap auth-password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Nhập mật khẩu"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                aria-pressed={showPassword}
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
        </div>
      </form>
    </div>
  )
}
