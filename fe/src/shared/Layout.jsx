import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShoppingCart,
  Trash2,
  User,
} from 'lucide-react'
import { useAuth } from '../features/auth/AuthContext'
import { api } from './api'

export default function Layout() {
  const { username, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [stockAlert, setStockAlert] = useState({ enabled: false, threshold: 10, lowStockCount: 0 })
  const menuRef = useRef(null)

  const loadStockAlert = useCallback(() => {
    api('/api/settings/inventory')
      .then(setStockAlert)
      .catch(() => setStockAlert({ enabled: false, threshold: 10, lowStockCount: 0 }))
  }, [])

  useEffect(() => {
    loadStockAlert()
    const id = setInterval(loadStockAlert, 60_000)
    return () => clearInterval(id)
  }, [loadStockAlert, location.pathname])

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

  const showStockBadge = stockAlert.enabled && stockAlert.lowStockCount > 0

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="brand">Tạp hóa Phúc Sơn</p>
          <p className="sub">Quản lý công nợ</p>
        </div>
        <nav>
          <NavLink to="/" end>
            <LayoutDashboard className="nav-icon" size={18} strokeWidth={2} aria-hidden />
            Danh sách nợ &amp; ghi nợ
          </NavLink>
          <NavLink to="/pos">
            <ShoppingCart className="nav-icon" size={18} strokeWidth={2} aria-hidden />
            Bán hàng
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) => `nav-products${isActive ? ' active' : ''}`}
          >
            <Package className="nav-icon" size={18} strokeWidth={2} aria-hidden />
            Hàng hóa
            {showStockBadge && (
              <span
                className="nav-stock-badge"
                title={`${stockAlert.lowStockCount} hàng sắp hết (dưới ${stockAlert.threshold})`}
              >
                {stockAlert.lowStockCount > 99 ? '99+' : stockAlert.lowStockCount}
              </span>
            )}
          </NavLink>
        </nav>
        <div className="user-box" ref={menuRef}>
          <button
            type="button"
            className="user-menu-btn"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
          >
            <User size={18} strokeWidth={2} aria-hidden />
            {username || 'admin'}
            <ChevronDown size={16} strokeWidth={2} aria-hidden />
          </button>
          {menuOpen && (
            <div className="user-dropdown">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/trash')
                }}
              >
                <Trash2 size={18} strokeWidth={2} aria-hidden />
                Thùng rác
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/settings')
                }}
              >
                <Settings size={18} strokeWidth={2} aria-hidden />
                Cài đặt
              </button>
              <button type="button" onClick={handleLogout}>
                <LogOut size={18} strokeWidth={2} aria-hidden />
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
