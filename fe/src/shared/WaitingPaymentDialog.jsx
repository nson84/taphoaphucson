import { useEffect, useMemo, useState } from 'react'
import { api } from './api'
import ConfirmDialog from './ConfirmDialog'
import { formatDateTime, formatMoney } from './format'

/**
 * Popup chờ khách thanh toán (QR) → chủ quán bấm hoàn thành để ghi sổ đã trả.
 * payAmount: số tiền QR / tổng thanh toán (khi trả lẻ theo số tiền).
 * items[].applyAmount: số sẽ trừ trên từng khoản (nếu có).
 */
export default function WaitingPaymentDialog({
  open,
  customerId,
  items = [],
  payAmount = null,
  busy = false,
  onClose,
  onComplete,
  onPrintInvoice,
}) {
  const [qr, setQr] = useState(null)
  const [qrNotice, setQrNotice] = useState('')
  const [qrLoading, setQrLoading] = useState(false)
  const [error, setError] = useState('')
  /** null | 'print' | 'complete' */
  const [confirmAction, setConfirmAction] = useState(null)

  const itemsTotal = useMemo(
    () =>
      items.reduce((sum, d) => {
        const n = Number(d.applyAmount != null ? d.applyAmount : d.amount) || 0
        return sum + n
      }, 0),
    [items],
  )
  const total = payAmount != null ? Number(payAmount) || 0 : itemsTotal
  const itemKey = useMemo(() => items.map((d) => `${d.id}:${d.applyAmount ?? d.amount}`).join(','), [items])

  useEffect(() => {
    if (!open || !customerId || items.length === 0 || total <= 0) return undefined
    let cancelled = false
    setQr(null)
    setQrNotice('')
    setError('')
    setConfirmAction(null)
    setQrLoading(true)

    ;(async () => {
      try {
        const amount = Math.round(total)
        const data = await api(`/api/customers/${customerId}/debt-qr`, {
          method: 'POST',
          body: JSON.stringify({ amount }),
        })
        if (!cancelled) setQr(data)
      } catch (e) {
        if (!cancelled) {
          setQrNotice(
            e.message ||
              'Chưa có QR — vào Cài đặt, bật QR và điền số tài khoản / tên chủ TK.',
          )
        }
      } finally {
        if (!cancelled) setQrLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [open, customerId, itemKey, total, items.length])

  if (!open) return null

  async function handleComplete() {
    setError('')
    try {
      if (qr?.id) {
        try {
          await api(`/api/debt-qr/${qr.id}/mark-used`, { method: 'POST' })
        } catch {
          /* ghi sổ vẫn chạy nếu mark-used lỗi */
        }
      }
      await onComplete(items.map((d) => d.id))
    } catch (e) {
      setError(e.message || 'Hoàn thành thanh toán thất bại')
      throw e
    }
  }

  async function onConfirmAction() {
    const action = confirmAction
    if (action === 'print') {
      setConfirmAction(null)
      onPrintInvoice?.({ items, qr, qrNotice, payAmount: total })
      return
    }
    if (action === 'complete') {
      await handleComplete()
      setConfirmAction(null)
    }
  }

  return (
    <>
      <div className="modal-backdrop" role="presentation" onClick={busy ? undefined : onClose}>
        <div
          className="modal-card waiting-payment-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="waiting-pay-title"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="waiting-payment-head">
            <h2 id="waiting-pay-title">Thanh toán</h2>
            <span className="status-badge status-waiting">Chờ thanh toán</span>
          </div>

          <p className="muted">
            Đang chờ khách thanh toán. Khi đã nhận tiền, bấm <strong>Hoàn thành thanh toán</strong>.
          </p>

          <div className="waiting-payment-list">
            <table>
              <thead>
                <tr>
                  <th>Ngày giờ</th>
                  <th>Sản phẩm</th>
                  <th>Số tiền</th>
                  <th>Trừ lần này</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => {
                  const apply = d.applyAmount != null ? Number(d.applyAmount) : Number(d.amount)
                  const debtAmt = Number(d.amount) || 0
                  const partial = apply < debtAmt
                  return (
                    <tr key={d.id}>
                      <td>{formatDateTime(d.occurredAt)}</td>
                      <td>{d.productNote || '—'}</td>
                      <td className="waiting-payment-amount">{formatMoney(d.amount)}</td>
                      <td className="waiting-payment-amount">
                        {formatMoney(apply)}
                        {partial ? ' (dở)' : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <p className="waiting-payment-total">
            Tổng thanh toán:{' '}
            <strong className="balance-unpaid">{formatMoney(total)}</strong>
          </p>

          <div className="waiting-payment-qr">
            {qrLoading && <p className="muted">Đang tạo mã QR…</p>}
            {!qrLoading && qr?.qrImageUrl && (
              <img className="waiting-payment-qr-img" src={qr.qrImageUrl} alt="VietQR thanh toán" />
            )}
            {!qrLoading && !qr?.qrImageUrl && (
              <p className="error">{qrNotice || 'Không tạo được mã QR.'}</p>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="actions waiting-payment-actions">
            <button type="button" className="btn-cancel" onClick={onClose} disabled={busy}>
              Hủy
            </button>
            <button
              type="button"
              className="ghost"
              disabled={busy || qrLoading}
              onClick={() => setConfirmAction('print')}
            >
              In hóa đơn
            </button>
            <button
              type="button"
              className="btn-pay"
              onClick={() => setConfirmAction('complete')}
              disabled={busy}
            >
              {busy ? 'Đang xử lý…' : 'Hoàn thành thanh toán'}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAction === 'print'}
        elevated
        title="In hóa đơn?"
        message="Bạn có chắc muốn in hóa đơn thanh toán này không?"
        confirmLabel="Có, in hóa đơn"
        cancelLabel="Không"
        busy={busy}
        onConfirm={onConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === 'complete'}
        elevated
        title="Hoàn thành thanh toán?"
        message={`Xác nhận đã nhận đủ ${formatMoney(total)} và ghi sổ đã trả?`}
        confirmLabel="Có, hoàn thành"
        cancelLabel="Không"
        busy={busy}
        onConfirm={onConfirmAction}
        onClose={() => setConfirmAction(null)}
      />
    </>
  )
}
