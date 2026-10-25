import { useEffect, useState } from 'react'

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Đóng',
  requirePin = false,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}) {
  const [pin, setPin] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (open) {
      setPin('')
      setLocalError('')
    }
  }, [open])

  if (!open) return null

  async function handleConfirm() {
    setLocalError('')
    if (requirePin && !pin.trim()) {
      setLocalError('Vui lòng nhập mã PIN')
      return
    }
    try {
      await onConfirm(requirePin ? pin.trim() : undefined)
    } catch (e) {
      setLocalError(e.message || 'Thao tác thất bại')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirm-title">{title}</h2>
        {message && <p className="muted">{message}</p>}
        {requirePin && (
          <label>
            Mã PIN
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Nhập mã PIN"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm()
              }}
            />
          </label>
        )}
        {localError && <p className="error">{localError}</p>}
        <div className="actions">
          <button type="button" className="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={danger ? 'danger' : undefined}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
