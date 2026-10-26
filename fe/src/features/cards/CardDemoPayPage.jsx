import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import { TELCO_LABEL } from './cardLabels'

export default function CardDemoPayPage() {
  const { reference } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api(`/api/card-orders/by-ref/${encodeURIComponent(reference)}`)
      .then(setOrder)
      .catch((e) => setError(e.message))
  }, [reference])

  async function confirmPay() {
    setBusy(true)
    setError('')
    try {
      await api(`/api/card-orders/by-ref/${encodeURIComponent(reference)}/simulate-pay`, {
        method: 'POST',
      })
      navigate(`/cards/orders/${reference}`, { replace: true })
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel form-page">
      <div className="form-page-head">
        <Link className="form-back" to="/cards">
          ← Hủy
        </Link>
        <h1>Thanh toán demo VTC Pay</h1>
        <p className="form-page-lead">
          Môi trường local: giả lập IPN thành công. Khi có website_id thật, tắt demoMode để
          chuyển sang cổng VTC.
        </p>
      </div>

      {error && <p className="error form-error">{error}</p>}

      {order && (
        <div className="form-section">
          <p>
            Đơn <strong>{order.referenceNumber}</strong>
          </p>
          <p>
            {TELCO_LABEL[order.telco] || order.telco} — {formatMoney(order.denomination)}
          </p>
          <p className="amount-preview">{formatMoney(order.amount)}</p>
          <div className="form-actions" style={{ border: 'none', marginTop: '1.25rem' }}>
            <button type="button" className="btn-cancel btn-lg" onClick={() => navigate('/cards')}>
              Hủy
            </button>
            <button
              type="button"
              className="btn-pay btn-lg"
              disabled={busy || order.status !== 'PENDING'}
              onClick={confirmPay}
            >
              {busy ? 'Đang xử lý…' : 'Giả lập thanh toán thành công'}
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
