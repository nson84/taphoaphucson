import { useEffect, useState } from 'react'
import { getToken } from './api'

const BACKUP_PASSWORD_KEY = 'taphoa.backupPassword'

export function rememberBackupPassword(password) {
  if (password) sessionStorage.setItem(BACKUP_PASSWORD_KEY, password)
  else sessionStorage.removeItem(BACKUP_PASSWORD_KEY)
}

export function readRememberedBackupPassword() {
  return sessionStorage.getItem(BACKUP_PASSWORD_KEY) || ''
}

/**
 * Chỉ dùng trên app desktop (Electron): chặn nút X / thoát,
 * hỏi có phải lần dùng cuối trước khi hết ca — sao lưu rồi tắt, hoặc ở lại.
 */
export default function ExitBackupDialog() {
  const desktop = typeof window !== 'undefined' ? window.taphoaDesktop : null
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [folder, setFolder] = useState('')

  useEffect(() => {
    if (!desktop?.onCloseRequest) return undefined
    return desktop.onCloseRequest(async () => {
      setError('')
      setPassword(readRememberedBackupPassword())
      try {
        const saved = (await desktop.getBackupFolder?.()) || ''
        setFolder(saved)
      } catch {
        setFolder('')
      }
      setOpen(true)
    })
  }, [desktop])

  if (!open) return null

  async function stay() {
    setOpen(false)
    setError('')
    setBusy(false)
  }

  async function backupAndQuit() {
    setError('')
    setBusy(true)
    try {
      let dir = folder
      if (!dir && desktop?.pickBackupFolder) {
        dir = (await desktop.pickBackupFolder()) || ''
        if (!dir) {
          setError('Chưa chọn thư mục lưu bản sao lưu')
          setBusy(false)
          return
        }
        setFolder(dir)
        await desktop.setBackupFolder?.(dir)
      }
      if (!dir) {
        setError('Vào Cài đặt → Backup để chọn thư mục lưu file, hoặc chọn khi thoát')
        setBusy(false)
        return
      }

      const pwd = password.trim()
      if (!pwd) {
        setError('Nhập mật khẩu Backup để tạo file')
        setBusy(false)
        return
      }

      const res = await fetch('/api/settings/backup/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken() || ''}`,
        },
        body: JSON.stringify({ password: pwd }),
      })
      if (res.status === 401) {
        window.location.href = '/login'
        throw new Error('Phiên đăng nhập hết hạn')
      }
      if (!res.ok) {
        let message = 'Không tạo được bản sao lưu'
        try {
          const data = await res.json()
          if (data?.message) message = data.message
        } catch {
          /* ignore */
        }
        throw new Error(message)
      }

      const buffer = await res.arrayBuffer()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = /filename="?([^"]+)"?/i.exec(disposition)
      const fileName = match?.[1] || `taphoa-backup-${Date.now()}.json`
      const written = await desktop.writeBackupFile({
        directory: dir,
        fileName,
        data: Array.from(new Uint8Array(buffer)),
      })
      if (!written?.ok) {
        throw new Error(written?.error || 'Không ghi được file vào thư mục đã chọn')
      }

      rememberBackupPassword(pwd)
      setOpen(false)
      await desktop.allowCloseAndQuit()
    } catch (err) {
      setError(err.message || 'Sao lưu thất bại')
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop exit-backup-backdrop" role="presentation">
      <div
        className="modal-card exit-backup-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="exit-backup-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="exit-backup-title" className="exit-backup-title">
          Bạn có chắc chắn đây là lần sử dụng{' '}
          <strong className="exit-backup-emph">cuối cùng</strong> trước khi hết ca làm việc không?
        </h2>
        <p className="exit-backup-lead">
          Nếu đúng là hết ca: tải dữ liệu xuống thư mục đã chọn rồi tắt phần mềm. Nếu bấm nhầm nút
          đóng: chọn ở lại.
        </p>

        {folder ? (
          <p className="muted exit-backup-folder">Thư mục: {folder}</p>
        ) : (
          <p className="muted exit-backup-folder">
            Chưa có thư mục — sẽ hỏi chọn thư mục khi bấm tải xuống.
          </p>
        )}

        <label className="field full">
          <span className="field-label">Mật khẩu Backup</span>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nhập mật khẩu backup"
            disabled={busy}
          />
        </label>

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="exit-backup-actions">
          <button
            type="button"
            className="btn-lg exit-backup-save"
            onClick={backupAndQuit}
            disabled={busy}
          >
            {busy ? 'Đang sao lưu…' : 'Tải dữ liệu xuống và Tắt phần mềm'}
          </button>
          <button type="button" className="btn-cancel btn-lg" onClick={stay} disabled={busy}>
            Không, tôi vẫn muốn ở lại phần mềm
          </button>
        </div>
      </div>
    </div>
  )
}
