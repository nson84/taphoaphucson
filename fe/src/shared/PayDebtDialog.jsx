import { useEffect, useState } from 'react'
import { formatMoney, formatMoneyInput, parseMoneyInput } from './format'
import { debtAmountError } from './moneyValidation'

/**
 * Trả hết / trả theo số tiền.
 * Nếu số tiền > khoản đang chọn → hỏi xác nhận tiếp tục trừ phần dư vào khoản nhỏ nhất.
 */
export default function PayDebtDialog({
  open,
  debtAmount,
  customerBalance,
  busy = false,
  onClose,
  onPayFull,
  onPayPartial,
}) {
  const [mode, setMode] = useState(null)
  const [amountDraft, setAmountDraft] = useState('')
  const [error, setError] = useState('')
  const debtMax = Number(debtAmount) || 0
  const totalMax = Number(customerBalance) > 0 ? Number(customerBalance) : debtMax

  useEffect(() => {
    if (open) {
      setMode(null)
      setAmountDraft('')
      setError('')
    }
  }, [open])

  if (!open) return null

  const payAmount = Number(amountDraft) || 0
  const surplus = payAmount > debtMax ? payAmount - debtMax : 0

  function onAmountChange(e) {
    const digits = parseMoneyInput(e.target.value)
    if (!digits) {
      setAmountDraft('')
      setError('')
      return
    }
    const n = Number(digits)
    if (n > totalMax) {
      setError(`Số tiền không được lớn hơn tổng còn nợ ${formatMoney(totalMax)}`)
      return
    }
    setError('')
    setAmountDraft(digits)
  }

  async function confirmPartial() {
    setError('')
    const n = Number(amountDraft)
    if (!amountDraft || !Number.isFinite(n) || n <= 0) {
      setError('Nhập số tiền cần trả')
      return
    }
    const shapeError = debtAmountError(n)
    if (shapeError) {
      setError(shapeError)
      return
    }
    if (n > totalMax) {
      setError(`Số tiền không được lớn hơn tổng còn nợ ${formatMoney(totalMax)}`)
      return
    }
    if (n > debtMax) {
      setMode('cascade')
      return
    }
    try {
      await onPayPartial(n, false)
    } catch (e) {
      setError(e.message || 'Thao tác thất bại')
    }
  }

  async function confirmCascade() {
    setError('')
    try {
      await onPayPartial(payAmount, true)
    } catch (e) {
      setError(e.message || 'Thao tác thất bại')
    }
  }

  async function confirmOnlyThisDebt() {
    setError('')
    try {
      await onPayPartial(debtMax, false)
    } catch (e) {
      setError(e.message || 'Thao tác thất bại')
    }
  }

  async function confirmFull() {
    setError('')
    try {
      await onPayFull()
    } catch (e) {
      setError(e.message || 'Thao tác thất bại')
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card pay-debt-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-debt-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="pay-debt-title">Trả nợ</h2>
        <p className="muted">
          Khoản đang chọn: <strong className="balance-unpaid">{formatMoney(debtAmount)}</strong>
          {totalMax > debtMax && (
            <>
              {' '}
              · Tổng còn nợ: <strong>{formatMoney(totalMax)}</strong>
            </>
          )}
        </p>

        {mode == null && (
          <>
            <div className="pay-debt-choices">
              <button type="button" className="btn-pay" disabled={busy} onClick={() => setMode('full')}>
                Trả hết khoản này
              </button>
              <button type="button" className="ghost" disabled={busy} onClick={() => setMode('partial')}>
                Trả theo số tiền
              </button>
            </div>
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={onClose} disabled={busy}>
                Đóng
              </button>
            </div>
          </>
        )}

        {mode === 'full' && (
          <>
            <p className="muted">Xác nhận trả hết khoản {formatMoney(debtAmount)}?</p>
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={() => setMode(null)} disabled={busy}>
                Quay lại
              </button>
              <button type="button" className="btn-pay" onClick={confirmFull} disabled={busy}>
                {busy ? 'Đang xử lý...' : 'Xác nhận trả hết'}
              </button>
            </div>
          </>
        )}

        {mode === 'partial' && (
          <>
            <label>
              Số tiền trả
              <input
                type="text"
                inputMode="numeric"
                autoFocus
                value={formatMoneyInput(amountDraft)}
                onChange={onAmountChange}
                placeholder="Vd: 6000"
              />
            </label>
            {payAmount > 0 && payAmount < debtMax && (
              <p className="muted">
                Sau khi trả, khoản này còn: <strong>{formatMoney(debtMax - payAmount)}</strong>
              </p>
            )}
            {payAmount > debtMax && (
              <p className="muted">
                Lớn hơn khoản đang chọn — bước sau sẽ hỏi có tiếp tục trả phần dư không.
              </p>
            )}
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={() => setMode(null)} disabled={busy}>
                Quay lại
              </button>
              <button type="button" className="btn-pay" onClick={confirmPartial} disabled={busy}>
                {busy ? 'Đang xử lý...' : 'Xác nhận trả'}
              </button>
            </div>
          </>
        )}

        {mode === 'cascade' && (
          <>
            <p className="muted">
              Sẽ trả hết khoản đang chọn ({formatMoney(debtMax)}). Còn dư{' '}
              <strong className="balance-unpaid">{formatMoney(surplus)}</strong>.
            </p>
            <p className="muted">
              Bấm <strong>Tiếp tục trả</strong> để tự trừ phần dư vào khoản nợ nhỏ nhất còn lại.
            </p>
            {error && <p className="error">{error}</p>}
            <div className="pay-debt-choices">
              <button type="button" className="btn-pay" disabled={busy} onClick={confirmCascade}>
                {busy ? 'Đang xử lý...' : 'Tiếp tục trả'}
              </button>
              <button type="button" className="ghost" disabled={busy} onClick={confirmOnlyThisDebt}>
                Chỉ trả hết khoản này
              </button>
            </div>
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={() => setMode('partial')} disabled={busy}>
                Quay lại
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
