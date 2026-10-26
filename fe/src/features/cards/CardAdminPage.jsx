import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import { statusClass, statusLabel, TELCO_LABEL } from './cardLabels'

export default function CardAdminPage() {
  const [orders, setOrders] = useState([])
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [serial, setSerial] = useState('')
  const [code, setCode] = useState('')
  const [pin, setPin] = useState('')
  const [localError, setLocalError] = useState('')

  function load() {
    api('/api/card-orders/awaiting-fulfillment')
      .then(setOrders)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
  }, [])

  async function fulfill() {
    if (!confirm) return
    setLocalError('')
    if (!serial.trim() || !code.trim()) {
      setLocalError('Nhập đủ serial và mã thẻ')
      return
    }
    if (!pin.trim()) {
      setLocalError('Vui lòng nhập mã PIN')
      return
    }
    setBusy(true)
    try {
      await api(`/api/card-orders/${confirm.id}/fulfill`, {
        method: 'POST',
        body: JSON.stringify({ pin: pin.trim(), serial: serial.trim(), code: code.trim() }),
      })
      setConfirm(null)
      setSerial('')
      setCode('')
      setPin('')
      load()
    } catch (e) {
      setLocalError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel form-page">
      <div className="form-page-head">
        <Link className="form-back" to="/cards">
          ← Mua thẻ
        </Link>
        <h1>Giao mã thẻ</h1>
        <p className="form-page-lead">
          Đơn đã thanh toán — nhập serial/mã (từ đại lý VTC 365 hoặc nguồn khác), cần PIN admin.
        </p>
      </div>

      {error && <p className="error form-error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Thẻ</th>
              <th>Tiền</th>
              <th>Trạng thái</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="row-paid">
                <td>{o.referenceNumber}</td>
                <td>
                  {TELCO_LABEL[o.telco] || o.telco} {formatMoney(o.denomination)}
                </td>
                <td>{formatMoney(o.amount)}</td>
                <td>
                  <span className={`status-badge ${statusClass(o.status)}`}>
                    {statusLabel(o.status)}
                  </span>
                </td>
                <td>
                  <button
                    type="button"
                    className="btn-edit"
                    onClick={() => {
                      setSerial('')
                      setCode('')
                      setPin('')
                      setLocalError('')
                      setConfirm(o)
                    }}
                  >
                    Giao mã
                  </button>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={5}>Không có đơn chờ giao</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {confirm && (
        <div className="modal-backdrop" role="presentation" onClick={() => setConfirm(null)}>
          <div className="modal-card" role="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Giao mã — {confirm.referenceNumber}</h2>
            <p className="muted">
              {TELCO_LABEL[confirm.telco] || confirm.telco} {formatMoney(confirm.denomination)}
            </p>
            <label>
              Serial
              <input value={serial} onChange={(e) => setSerial(e.target.value)} autoFocus />
            </label>
            <label>
              Mã thẻ
              <input value={code} onChange={(e) => setCode(e.target.value)} />
            </label>
            <label>
              Mã PIN
              <input
                type="password"
                inputMode="numeric"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              />
            </label>
            {localError && <p className="error">{localError}</p>}
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={() => setConfirm(null)} disabled={busy}>
                Đóng
              </button>
              <button type="button" className="btn-pay" onClick={fulfill} disabled={busy}>
                {busy ? 'Đang lưu…' : 'Giao mã'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
