import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import { statusClass, statusLabel, TELCO_LABEL } from './cardLabels'
import { VTC_BUY_CARD_URL } from './vtcLinks'

export default function CardShopPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [telco, setTelco] = useState('VIETTEL')
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')
  const [demoMode, setDemoMode] = useState(true)

  function reloadOrders() {
    api('/api/card-orders').then(setOrders).catch(() => {})
  }

  useEffect(() => {
    api('/api/card-products').then(setProducts).catch((e) => setError(e.message))
    reloadOrders()
    api('/api/payments/vtcpay/config')
      .then((c) => setDemoMode(Boolean(c.demoMode)))
      .catch(() => {})
  }, [])

  const telcos = useMemo(() => [...new Set(products.map((p) => p.telco))], [products])
  const filtered = products.filter((p) => p.telco === telco)

  async function buy(productId) {
    setError('')
    setBusyId(productId)
    try {
      const order = await api('/api/card-orders', {
        method: 'POST',
        body: JSON.stringify({ productId }),
      })
      if (order.checkoutUrl) {
        window.location.href = order.checkoutUrl
      } else {
        navigate(`/cards/orders/${order.referenceNumber}`)
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="card-shop">
      <section className="card-shop-hero">
        <p className="card-shop-brand">Tạp hóa Phúc Sơn</p>
        <div className="form-page-title-row">
          <h1>Mua thẻ cào</h1>
          {demoMode && <span className="status-badge status-unpaid">Đang demo</span>}
        </div>
        <p className="card-shop-lead">
          Chọn thẻ → thanh toán trên web này → nhận mã tại đây. Hiện đang chạy{' '}
          <strong>demo</strong> (giả lập thanh toán). Khi có cổng VTC merchant sẽ trả tiền
          thật; giao mã vẫn trên web Phúc Sơn.
        </p>
      </section>

      <ol className="card-shop-steps">
        <li>
          <span className="step-num">1</span>
          Chọn nhà mạng &amp; mệnh giá
        </li>
        <li>
          <span className="step-num">2</span>
          Thanh toán (demo hoặc VTC)
        </li>
        <li>
          <span className="step-num">3</span>
          Admin giao mã → xem mã trên đơn
        </li>
      </ol>

      {error && <p className="error form-error">{error}</p>}

      <section className="card-shop-panel">
        <div className="card-telco-tabs" role="tablist" aria-label="Nhà mạng">
          {telcos.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={telco === t}
              className={`card-telco-btn ${telco === t ? 'is-active' : ''}`}
              onClick={() => setTelco(t)}
            >
              {TELCO_LABEL[t] || t}
            </button>
          ))}
        </div>

        <div className="card-product-grid">
          {filtered.map((p) => (
            <article key={p.id} className={`card-product telco-${p.telco.toLowerCase()}`}>
              <p className="card-product-telco">{TELCO_LABEL[p.telco] || p.telco}</p>
              <p className="card-product-denom">{formatMoney(p.denomination)}</p>
              <p className="card-product-price">Giá: {formatMoney(p.price)}</p>
              <button
                type="button"
                className="btn-pay btn-lg"
                disabled={busyId === p.id}
                onClick={() => buy(p.id)}
              >
                {busyId === p.id ? 'Đang tạo đơn…' : 'Mua ngay'}
              </button>
            </article>
          ))}
          {filtered.length === 0 && <p className="muted">Chưa có mệnh giá</p>}
        </div>
      </section>

      <section className="card-shop-panel">
        <div className="panel-head" style={{ marginBottom: '0.75rem' }}>
          <h2 className="form-section-title" style={{ margin: 0 }}>
            Đơn gần đây
          </h2>
          <Link className="btn-edit" to="/cards/admin">
            Giao mã
          </Link>
        </div>
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
              {orders.slice(0, 10).map((o) => (
                <tr key={o.id}>
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
                    <Link to={`/cards/orders/${o.referenceNumber}`}>Chi tiết</Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={5}>Chưa có đơn — bấm Mua ngay để thử</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <details className="card-shop-advanced">
        <summary>Mở trang mua thẻ VTC (không qua đơn nội bộ)</summary>
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          Chỉ khi muốn khách tự mua trực tiếp trên site VTC.
        </p>
        <a className="btn btn-lg" href={VTC_BUY_CARD_URL} target="_blank" rel="noreferrer">
          Mở VTC Pay
        </a>
      </details>
    </div>
  )
}
