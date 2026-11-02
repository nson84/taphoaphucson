import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, getToken } from '../../shared/api'

export default function SettingsPage() {
  const desktop = typeof window !== 'undefined' ? window.taphoaDesktop : null
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const [backupDownloading, setBackupDownloading] = useState(false)
  const [backupError, setBackupError] = useState('')
  const [backupSuccess, setBackupSuccess] = useState('')
  const [backupFolder, setBackupFolder] = useState('')

  const [invEnabled, setInvEnabled] = useState(true)
  const [invThreshold, setInvThreshold] = useState('10')
  const [invBusy, setInvBusy] = useState(false)
  const [invError, setInvError] = useState('')
  const [invSuccess, setInvSuccess] = useState('')
  const [invCount, setInvCount] = useState(0)

  useEffect(() => {
    if (!desktop?.getBackupFolder) return
    desktop.getBackupFolder().then((dir) => setBackupFolder(dir || '')).catch(() => {})
  }, [desktop])

  useEffect(() => {
    api('/api/settings/inventory')
      .then((d) => {
        setInvEnabled(Boolean(d.enabled))
        setInvThreshold(String(d.threshold ?? 10))
        setInvCount(Number(d.lowStockCount) || 0)
      })
      .catch(() => {})
  }, [])

  async function onSaveInventory(e) {
    e.preventDefault()
    setInvError('')
    setInvSuccess('')
    const threshold = Number(invThreshold)
    if (!Number.isFinite(threshold) || threshold < 1 || threshold > 9999) {
      setInvError('Ngưỡng tồn kho phải từ 1 đến 9999')
      return
    }
    setInvBusy(true)
    try {
      const d = await api('/api/settings/inventory', {
        method: 'PUT',
        body: JSON.stringify({ enabled: invEnabled, threshold }),
      })
      setInvEnabled(Boolean(d.enabled))
      setInvThreshold(String(d.threshold))
      setInvCount(Number(d.lowStockCount) || 0)
      setInvSuccess('Đã lưu cảnh báo tồn kho')
    } catch (err) {
      setInvError(err.message)
    } finally {
      setInvBusy(false)
    }
  }

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
      let dir = backupFolder
      if (desktop?.getBackupFolder) {
        dir = dir || (await desktop.getBackupFolder()) || ''
        if (!dir && desktop.pickBackupFolder) {
          dir = (await desktop.pickBackupFolder()) || ''
        }
        if (!dir) {
          throw new Error('Chưa có thư mục sao lưu — chọn thư mục trước')
        }
        if (dir !== backupFolder) setBackupFolder(dir)
      }

      const res = await fetch('/api/settings/backup/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken() || ''}`,
        },
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
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = /filename="?([^"]+)"?/i.exec(disposition)
      const filename = match?.[1] || `taphoa-backup-${Date.now()}.json`

      // App desktop: ghi thẳng vào thư mục backup (mặc định D:\backup_data_banhang_taphoaphucson)
      if (desktop?.writeBackupFile && dir) {
        const buffer = await res.arrayBuffer()
        const written = await desktop.writeBackupFile({
          directory: dir,
          fileName: filename,
          data: Array.from(new Uint8Array(buffer)),
        })
        if (!written?.ok) {
          throw new Error(written?.error || 'Không ghi được file vào thư mục đã chọn')
        }
        setBackupSuccess(`Đã lưu: ${written.path || `${dir}\\${filename}`}`)
        return
      }

      // Trình duyệt dev: tải về thư mục Downloads của trình duyệt
      const blob = await res.blob()
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
          ← Quay lại danh sách nợ &amp; ghi nợ
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

      <form className="form-card" onSubmit={onSaveInventory} style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <div className="form-section">
          <h2 className="form-section-title">Cảnh báo tồn kho</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Hiện icon trên mục Hàng hóa khi còn hàng nhưng dưới ngưỡng đã chọn. Tồn = 0 hoặc âm vẫn bán bình
            thường; tắt cảnh báo nếu cửa hàng không theo dõi tồn kho.
          </p>
          <div className="form-grid">
            <label className="inventory-toggle full">
              <input
                type="checkbox"
                checked={invEnabled}
                onChange={(e) => setInvEnabled(e.target.checked)}
              />
              <span>Bật thông báo tồn thấp</span>
            </label>
            <label className="field">
              <span className="field-label">Cảnh báo khi còn dưới (đơn vị cơ bản)</span>
              <input
                type="number"
                min={1}
                max={9999}
                required
                value={invThreshold}
                onChange={(e) => setInvThreshold(e.target.value.replace(/\D/g, '').slice(0, 4))}
              />
            </label>
            <p className="muted field full" style={{ margin: 0 }}>
              Hiện đang có <strong>{invCount}</strong> hàng trong ngưỡng cảnh báo.
            </p>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn-lg" disabled={invBusy}>
              {invBusy ? 'Đang lưu…' : 'Lưu cảnh báo tồn kho'}
            </button>
          </div>
          {invError && <p className="error">{invError}</p>}
          {invSuccess && <p className="success">{invSuccess}</p>}
        </div>
      </form>

      <div className="form-card" style={{ marginTop: '1.5rem' }}>
        <div className="form-section">
          <h2 className="form-section-title">Backup</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Sao lưu toàn bộ dữ liệu ra file JSON vào thư mục bên dưới (mặc định{' '}
            <code>D:\backup_data_banhang_taphoaphucson</code>). Dùng khi tắt app hoặc bấm tải thủ
            công.
          </p>

          <div className="form-grid" style={{ marginBottom: '0.75rem' }}>
            <label className="field full">
              <span className="field-label">Thư mục sao lưu</span>
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
          </div>

          {backupError && <p className="error">{backupError}</p>}
          {backupSuccess && <p className="success">{backupSuccess}</p>}
        </div>
      </div>
    </section>
  )
}
