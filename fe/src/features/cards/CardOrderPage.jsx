import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import { statusClass, statusLabel, TELCO_LABEL } from './cardLabels'

export default function CardOrderPage() {
  const { reference } = useParams()
  const [order, setOrder] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    api(`/api/card-orders/by-ref/${encodeURIComponent(reference)}`)
      .then(setOrder)
      .catch((e) => setError(e.message))
  }, [reference])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!order || (order.status !== 'PENDING' && order.status !== 'REVIEW')) return
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
  }, [order, load])

  if (error) {
    return (
      <section className="panel form-page">
        <p className="error form-error">{error}</p>
        <Link className="form-back" to="/cards">
          ← Mua thẻ
        </Link>
      </section>
    )
  }

  if (!order) {
    return (
      <section className="panel form-page">
        <p className="muted">Đang tải đơn…</p>
      </section>
    )
  }

  return (
    <section className="panel form-page">
      <div className="form-page-head">
        <Link className="form-back" to="/cards">
          ← Mua thẻ
        </Link>
        <div className="form-page-title-row">
          <h1>Đơn {order.referenceNumber}</h1>
          <span className={`status-badge ${statusClass(order.status)}`}>
            {statusLabel(order.status)}
          </span>
        </div>
      </div>

      <div className="form-section">
        <p>
          <strong>
            {TELCO_LABEL[order.telco] || order.telco} {formatMoney(order.denomination)}
          </strong>
        </p>
        <p>Số tiền: {formatMoney(order.amount)}</p>
        {order.vtcTransRef && <p className="muted">Mã VTC: {order.vtcTransRef}</p>}

        {order.status === 'PENDING' && order.checkoutUrl && (
          <div className="form-actions" style={{ border: 'none', marginTop: '1rem' }}>
            <a className="btn btn-lg btn-pay" href={order.checkoutUrl}>
              Tiếp tục thanh toán
            </a>
          </div>
        )}

        {order.status === 'PAID' && (
          <div className="notice notice-paid" style={{ marginTop: '1rem' }}>
            <p>
              Đã nhận thanh toán. Mã thẻ sẽ hiện ở đây sau khi admin giao mã (hoặc API đại lý
              sau này).
            </p>
          </div>
        )}

        {order.status === 'DELIVERED' && order.codes?.length > 0 && (
          <div className="card-codes">
            <h2 className="form-section-title">Mã thẻ của bạn</h2>
            {order.codes.map((c, i) => (
              <div key={i} className="card-code-block">
                <p>
                  Serial: <strong>{c.serial}</strong>
                </p>
                <p>
                  Mã: <strong>{c.code}</strong>
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
