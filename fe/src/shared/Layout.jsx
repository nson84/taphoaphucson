import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

export default function Layout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function onDocClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand">Tạp hóa Phúc Sơn</p>
          <p className="sub">Quản lý công nợ</p>
        </div>
        <nav>
          <NavLink to="/" end>
            Tổng hợp
          </NavLink>
          <NavLink to="/debts">Danh sách nợ</NavLink>
          <NavLink to="/cards">Mua thẻ</NavLink>
        </nav>
        <div className="user-box" ref={menuRef}>
          <button
            type="button"
            className="user-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            {username || 'admin'} ▾
          </button>
          {menuOpen && (
            <div className="user-dropdown">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/settings')
                }}
              >
                Cài đặt
              </button>
              <button type="button" onClick={handleLogout}>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
