import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getToken } from '../../shared/api'
import { rememberBackupPassword } from '../../shared/ExitBackupDialog'

export default function SettingsPage() {
  const desktop = typeof window !== 'undefined' ? window.taphoaDesktop : null
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [backupPassword, setBackupPassword] = useState('')
  const [backupUnlocked, setBackupUnlocked] = useState(false)
  const [backupUnlocking, setBackupUnlocking] = useState(false)
  const [backupDownloading, setBackupDownloading] = useState(false)
  const [backupError, setBackupError] = useState('')
  const [backupSuccess, setBackupSuccess] = useState('')
  const [backupFolder, setBackupFolder] = useState('')

  useEffect(() => {
    if (!desktop?.getBackupFolder) return
    desktop.getBackupFolder().then((dir) => setBackupFolder(dir || '')).catch(() => {})
  }, [desktop])

  async function onSubmitPin(e) {
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

  async function onUnlockBackup(e) {
    e.preventDefault()
    setBackupError('')
    setBackupSuccess('')
    setBackupUnlocking(true)
    try {
      await api('/api/settings/backup/unlock', {
        method: 'POST',
        body: JSON.stringify({ password: backupPassword }),
      })
      setBackupUnlocked(true)
      rememberBackupPassword(backupPassword)
      setBackupSuccess('Đã mở mục Backup')
    } catch (err) {
      setBackupUnlocked(false)
      setBackupError(err.message)
    } finally {
      setBackupUnlocking(false)
    }
  }

  async function onPickBackupFolder() {
    setBackupError('')
    setBackupSuccess('')
    if (!desktop?.pickBackupFolder) {
      setBackupError('Chọn thư mục chỉ có trên app desktop (Portable / Setup)')
      return
    }
    try {
      const dir = await desktop.pickBackupFolder()
      if (!dir) return
      setBackupFolder(dir)
      setBackupSuccess(`Đã chọn thư mục: ${dir}`)
    } catch (err) {
      setBackupError(err.message || 'Không chọn được thư mục')
    }
  }

  async function onDownloadBackup() {
    setBackupError('')
    setBackupSuccess('')
    setBackupDownloading(true)
    try {
      const res = await fetch('/api/settings/backup/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken() || ''}`,
        },
        body: JSON.stringify({ password: backupPassword }),
      })
      if (res.status === 401) {
        window.location.href = '/login'
        throw new Error('Unauthorized')
      }
      if (!res.ok) {
        let message = 'Không tải được bản sao lưu'
        try {
          const data = await res.json()
          if (data?.message) message = data.message
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }
      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = /filename="?([^"]+)"?/i.exec(disposition)
      const filename = match?.[1] || `taphoa-backup-${Date.now()}.json`
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setBackupSuccess(`Đã tải file ${filename}`)
    } catch (err) {
      setBackupError(err.message)
    } finally {
      setBackupDownloading(false)
    }
  }

  return (
    <section className="panel form-page">
      <div className="form-page-head">
        <Link className="form-back" to="/">
          ← Quay lại tổng hợp
        </Link>
        <h1>Cài đặt</h1>
      </div>

      <form className="form-card" onSubmit={onSubmitPin} style={{ marginBottom: '1.5rem' }}>
        <div className="form-section">
          <h2 className="form-section-title">Mã PIN</h2>
          <div className="form-grid">
            <label className="field full">
              <span className="field-label">PIN hiện tại</span>
              <input
                type="password"
                inputMode="numeric"
                required
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Nhập PIN hiện tại"
              />
            </label>
            <label className="field">
              <span className="field-label">PIN mới</span>
              <input
                type="password"
                inputMode="numeric"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="4-8 chữ số"
              />
            </label>
            <label className="field">
              <span className="field-label">Xác nhận PIN mới</span>
              <input
                type="password"
                inputMode="numeric"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
                placeholder="Nhập lại PIN mới"
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-lg" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu mã PIN'}
            </button>
          </div>
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      {success && <p className="success">{success}</p>}

      <div className="form-card" style={{ marginTop: '1.5rem' }}>
        <div className="form-section">
          <h2 className="form-section-title">Backup</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Sao lưu toàn bộ dữ liệu ra file JSON. Mục này được khóa bằng mật khẩu riêng.
          </p>

          {!backupUnlocked ? (
            <form onSubmit={onUnlockBackup}>
              <div className="form-grid">
                <label className="field full">
                  <span className="field-label">Mật khẩu Backup</span>
                  <input
                    type="password"
                    inputMode="numeric"
                    required
                    value={backupPassword}
                    onChange={(e) => setBackupPassword(e.target.value)}
                    placeholder="Nhập mật khẩu để mở"
                    autoComplete="off"
                  />
                </label>
              </div>
              <div className="form-actions">
                <button type="submit" className="btn-lg" disabled={backupUnlocking}>
                  {backupUnlocking ? 'Đang mở…' : 'Mở mục Backup'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <p className="muted">
                Đã mở khóa. Chọn thư mục cố định để khi tắt app (nút X) có thể sao lưu vào đó, hoặc tải
                file thủ công.
              </p>
              <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
                <label className="field full">
                  <span className="field-label">Thư mục sao lưu khi tắt app</span>
                  <input
                    readOnly
                    value={backupFolder || 'Chưa chọn'}
                    placeholder="Chưa chọn thư mục"
                  />
                </label>
              </div>
              <div className="form-actions">
                {desktop?.pickBackupFolder && (
                  <button type="button" className="btn-lg" onClick={onPickBackupFolder}>
                    Chọn thư mục…
                  </button>
                )}
                <button
                  type="button"
                  className="btn-lg"
                  disabled={backupDownloading}
                  onClick={onDownloadBackup}
                >
                  {backupDownloading ? 'Đang tạo file…' : 'Tải bản sao lưu'}
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => {
                    setBackupUnlocked(false)
                    setBackupPassword('')
                    rememberBackupPassword('')
                    setBackupSuccess('')
                    setBackupError('')
                  }}
                >
                  Khóa lại
                </button>
              </div>
            </div>
          )}

          {backupError && <p className="error">{backupError}</p>}
          {backupSuccess && <p className="success">{backupSuccess}</p>}
        </div>
      </div>
    </section>
  )
}
