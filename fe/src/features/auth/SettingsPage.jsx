import { useState } from 'react'
import { api } from '../../shared/api'

export default function SettingsPage() {
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!/^\d{4,8}$/.test(newPin)) {
      setError('PIN mới phải gồm 4-8 chữ số')
      return
    }
    if (newPin !== confirmPin) {
      setError('PIN xác nhận không khớp')
      return
    }
    setLoading(true)
    try {
      await api('/api/profile/pin', {
        method: 'PUT',
        body: JSON.stringify({ currentPin, newPin }),
      })
      setSuccess('Đã cập nhật mã PIN')
      setCurrentPin('')
      setNewPin('')
      setConfirmPin('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel">
      <h1>Cài đặt</h1>
      <p className="muted">Đổi mã PIN dùng khi hủy trả nợ (mặc định: 123456).</p>
      <form className="form-grid settings-form" onSubmit={onSubmit}>
        <label className="full">
          PIN hiện tại
          <input
            type="password"
            inputMode="numeric"
            required
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="Nhập PIN hiện tại"
          />
        </label>
        <label>
          PIN mới
          <input
            type="password"
            inputMode="numeric"
            required
            value={newPin}
            onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="4-8 chữ số"
          />
        </label>
        <label>
          Xác nhận PIN mới
          <input
            type="password"
            inputMode="numeric"
            required
            value={confirmPin}
            onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
            placeholder="Nhập lại PIN mới"
          />
        </label>
        {error && <p className="error full">{error}</p>}
        {success && <p className="success full">{success}</p>}
        <div className="actions full">
          <button type="submit" disabled={loading}>
            {loading ? 'Đang lưu...' : 'Lưu mã PIN'}
          </button>
        </div>
      </form>
    </section>
  )
}
