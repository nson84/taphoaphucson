import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { api } from '../../shared/api'

const UNLOCK_KEY = 'taphoa_cards_unlocked'

function isUnlocked() {
  return sessionStorage.getItem(UNLOCK_KEY) === '1'
}

export function clearCardsUnlock() {
  sessionStorage.removeItem(UNLOCK_KEY)
}

export default function CardsPinGate() {
  const [unlocked, setUnlocked] = useState(() => isUnlocked())
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Rời khu vực Mua thẻ (sang Tổng hợp / Danh sách nợ…) → khóa lại, vào lại phải nhập PIN
  useEffect(() => {
    return () => clearCardsUnlock()
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    if (!pin.trim()) {
      setError('Vui lòng nhập mã PIN')
      return
    }
    setLoading(true)
    try {
      await api('/api/profile/pin/verify', {
        method: 'POST',
        body: JSON.stringify({ pin: pin.trim() }),
      })
      sessionStorage.setItem(UNLOCK_KEY, '1')
      setUnlocked(true)
      setPin('')
    } catch (err) {
      setError(err.message || 'Mã PIN không đúng')
    } finally {
      setLoading(false)
    }
  }

  if (unlocked) {
    return <Outlet />
  }

  return (
    <section className="panel form-page cards-pin-gate">
      <div className="form-page-head">
        <h1>Mã PIN — Mua thẻ</h1>
      </div>
      <form className="form-card cards-pin-form" onSubmit={onSubmit} noValidate>
        <label className={`field${error ? ' field-invalid' : ''}`}>
          <span className="field-label">
            Mã PIN <span className="req">*</span>
          </span>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            maxLength={8}
            value={pin}
            onChange={(e) => {
              setPin(e.target.value.replace(/\D/g, '').slice(0, 8))
              setError('')
            }}
            placeholder="Nhập mã PIN"
            aria-invalid={Boolean(error)}
          />
          {error && (
            <span className="field-error" role="alert">
              {error}
            </span>
          )}
        </label>
        <div className="form-actions" style={{ border: 'none', paddingTop: 0 }}>
          <button type="submit" className="btn-lg" disabled={loading}>
            {loading ? 'Đang kiểm tra…' : 'Vào mua thẻ'}
          </button>
        </div>
      </form>
    </section>
  )
}
