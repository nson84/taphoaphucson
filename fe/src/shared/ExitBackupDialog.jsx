import { useEffect, useState } from 'react'
import { getToken } from './api'
import { countUnpaidPosInvoices } from '../features/pos/posDraftStats'

/**
 * Chỉ dùng trên app desktop (Electron): chặn nút X / thoát,
 * hỏi có phải lần dùng cuối trước khi hết ca — sao lưu rồi tắt, hoặc ở lại.
 */
export default function ExitBackupDialog() {
  const desktop = typeof window !== 'undefined' ? window.taphoaDesktop : null
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [folder, setFolder] = useState('')
  const [unpaidPos, setUnpaidPos] = useState(0)

  useEffect(() => {
    if (!desktop?.onCloseRequest) return undefined
    return desktop.onCloseRequest(async () => {
      setError('')
      setUnpaidPos(countUnpaidPosInvoices())
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

  async function quitWithoutBackup() {
    setError('')
    setBusy(true)
    try {
      setOpen(false)
      await desktop.allowCloseAndQuit()
      setBusy(false)
    } catch (err) {
      setError(err.message || 'Không tắt được phần mềm')
      setOpen(true)
      setBusy(false)
    }
  }

  async function changeFolder() {
    if (!desktop?.pickBackupFolder) return
    setError('')
    try {
      const dir = (await desktop.pickBackupFolder()) || ''
      if (dir) setFolder(dir)
    } catch (err) {
      setError(err.message || 'Không chọn được thư mục')
    }
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

      const res = await fetch('/api/settings/backup/download', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken() || ''}`,
        },
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

      setOpen(false)
      await desktop.allowCloseAndQuit()
      setBusy(false)
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
          Chọn một trong ba: tắt luôn (không lưu dữ liệu), lưu dữ liệu rồi tắt, hoặc ở lại phần
          mềm nếu bấm nhầm nút đóng.
        </p>

        {unpaidPos > 0 && (
          <p className="exit-backup-pos-hint" role="status">
            Còn {unpaidPos} hóa đơn chưa thanh toán (đã lưu tạm trên máy) — mở lại phần mềm sẽ
            khôi phục giỏ hàng. Không tự tạo hóa đơn trên hệ thống khi tắt.
          </p>
        )}

        {folder ? (
          <p className="muted exit-backup-folder">
            Thư mục sao lưu: {folder}{' '}
            {desktop?.pickBackupFolder && (
              <button
                type="button"
                className="link-btn exit-backup-change"
                onClick={changeFolder}
                disabled={busy}
              >
                Đổi thư mục
              </button>
            )}
          </p>
        ) : (
          <p className="muted exit-backup-folder">
            Chưa có thư mục — sẽ hỏi chọn thư mục khi bấm lưu dữ liệu.
          </p>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="exit-backup-actions">
          <button
            type="button"
            className="btn-lg exit-backup-nosave"
            onClick={quitWithoutBackup}
            disabled={busy}
          >
            Tắt phần mềm, không lưu dữ liệu
          </button>
          <button
            type="button"
            className="btn-lg exit-backup-save"
            onClick={backupAndQuit}
            disabled={busy}
          >
            {busy ? 'Đang sao lưu…' : 'Lưu dữ liệu và Tắt phần mềm'}
          </button>
          <button type="button" className="btn-cancel btn-lg" onClick={stay} disabled={busy}>
            Ở lại phần mềm
          </button>
        </div>
      </div>
    </div>
  )
}
