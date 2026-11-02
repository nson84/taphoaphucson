import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Ban,
  Banknote,
  CircleDollarSign,
  Clock,
  CreditCard,
  HandCoins,
  Hash,
  Landmark,
  Package,
  Percent,
  Receipt,
  ShoppingCart,
  Split,
  Tag,
  User,
  Wallet,
} from 'lucide-react'
import { api } from '../../shared/api'
import { formatDateTime, formatMoney } from '../../shared/format'
import { formatSalePayment } from '../../shared/paymentLabels'
import ConfirmDialog from '../../shared/ConfirmDialog'
import { useToast } from '../../shared/ToastContext'

const PAY_VISUAL = {
  CASH: { icon: Banknote, tone: 'cash' },
  TRANSFER: { icon: Landmark, tone: 'transfer' },
  CARD: { icon: CreditCard, tone: 'card' },
  WALLET: { icon: Wallet, tone: 'wallet' },
  DEBT: { icon: HandCoins, tone: 'debt' },
  MIXED: { icon: Split, tone: 'mixed' },
}

function payVisual(sale) {
  if (sale.cancelledAt) return { icon: Ban, tone: 'cancelled' }
  const method = String(sale.paymentMethod || 'CASH').toUpperCase()
  const debt = Number(sale.debtAmount) || 0
  if (method === 'MIXED' || (debt > 0 && method !== 'DEBT')) return PAY_VISUAL.MIXED
  return PAY_VISUAL[method] || PAY_VISUAL.CASH
}

/** Chuỗi sửa dồn "Sửa từ A — Sửa từ B" → chỉ hiện lần mới nhất (đầu chuỗi). */
function formatAmendNote(note) {
  const s = String(note || '').trim()
  if (!s) return ''
  const newest = s.match(/^Sửa từ\s+\S+/i)
  if (newest && /Sửa từ\s+\S+\s*[—–-]\s*Sửa từ/i.test(s)) {
    const custom = s
      .replace(/Sửa từ\s+\S+/gi, '')
      .replace(/[—–-]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return custom ? `${newest[0]} — ${custom}` : newest[0]
  }
  return s
}

export default function SaleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [sale, setSale] = useState(null)
  const [error, setError] = useState('')
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [confirmAmend, setConfirmAmend] = useState(false)
  const [busy, setBusy] = useState(false)

  function load() {
    api(`/api/sales/${id}`)
      .then(setSale)
      .catch((e) => setError(e.message))
  }

  useEffect(() => {
    load()
  }, [id])

  async function doCancel() {
    setBusy(true)
    try {
      await api(`/api/sales/${id}/cancel`, { method: 'POST' })
      toast.success('Đã hủy hóa đơn, hoàn tồn')
      setConfirmCancel(false)
      load()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  function goAmendCart() {
    setConfirmAmend(false)
    navigate('/pos', { state: { reopenSale: sale } })
  }

  if (error) {
    return (
      <section className="panel">
        <p className="error">{error}</p>
        <Link to="/sales">← Lịch sử</Link>
      </section>
    )
  }
  if (!sale) {
    return (
      <section className="panel">
        <p>Đang tải…</p>
      </section>
    )
  }

  const items = sale.items || []
  const qtyTotal = items.reduce((sum, it) => sum + (Number(it.qty) || 0), 0)
  const discount = Number(sale.discountAmount) || 0
  const rounding = Number(sale.roundingAmount) || 0
  const debt = Number(sale.debtAmount) || 0
  const pay = payVisual(sale)
  const PayIcon = pay.icon
  const payLabel = formatSalePayment({
    paymentMethod: sale.paymentMethod,
    debtAmount: sale.debtAmount,
    cancelledAt: sale.cancelledAt,
  })
  const customerLabel = sale.customerName || 'Khách lẻ'

  return (
    <section className="panel form-page sale-detail-page">
      <div className="form-page-head">
        <Link className="form-back" to="/sales">
          <ArrowLeft size={18} strokeWidth={2.4} aria-hidden />
          Lịch sử
        </Link>
      </div>

      <header className={`sale-detail-hero${sale.cancelledAt ? ' is-cancelled' : ''}`}>
        <div className="sale-detail-hero-main">
          <span className="sale-detail-hero-icon" aria-hidden>
            <Receipt size={26} strokeWidth={2} />
          </span>
          <div>
            <h1>{sale.code}</h1>
            <p className="sale-detail-time">
              <Clock size={15} strokeWidth={2.2} aria-hidden />
              {formatDateTime(sale.occurredAt)}
            </p>
          </div>
        </div>
        <span className={`sale-pay-badge ${pay.tone}`}>
          <PayIcon size={16} strokeWidth={2.2} aria-hidden />
          {payLabel}
        </span>
      </header>

      <div className="sale-detail-meta">
        <div className="sale-meta-card">
          <span className="sale-meta-icon customer" aria-hidden>
            <User size={18} strokeWidth={2.2} />
          </span>
          <div>
            <span className="sale-meta-label">Khách hàng</span>
            <strong>
              {sale.customerId ? (
                <Link to={`/customers/${sale.customerId}`}>{customerLabel}</Link>
              ) : (
                customerLabel
              )}
            </strong>
          </div>
        </div>
        <div className="sale-meta-card">
          <span className="sale-meta-icon items" aria-hidden>
            <Package size={18} strokeWidth={2.2} />
          </span>
          <div>
            <span className="sale-meta-label">Hàng trong đơn</span>
            <strong>
              {items.length} mặt · {qtyTotal} SP
            </strong>
          </div>
        </div>
        <div className="sale-meta-card">
          <span className="sale-meta-icon money" aria-hidden>
            <Banknote size={18} strokeWidth={2.2} />
          </span>
          <div>
            <span className="sale-meta-label">Tổng thanh toán</span>
            <strong className="sale-meta-money">{formatMoney(sale.totalAmount)}</strong>
          </div>
        </div>
        {discount > 0 && (
          <div className="sale-meta-card">
            <span className="sale-meta-icon discount" aria-hidden>
              <Percent size={18} strokeWidth={2.2} />
            </span>
            <div>
              <span className="sale-meta-label">Giảm giá</span>
              <strong>{formatMoney(discount)}</strong>
            </div>
          </div>
        )}
        {rounding > 0 && (
          <div className="sale-meta-card">
            <span className="sale-meta-icon discount" aria-hidden>
              <Percent size={18} strokeWidth={2.2} />
            </span>
            <div>
              <span className="sale-meta-label">Làm tròn</span>
              <strong>+{formatMoney(rounding)}</strong>
            </div>
          </div>
        )}
        {debt > 0 && (
          <div className="sale-meta-card">
            <span className="sale-meta-icon debt" aria-hidden>
              <HandCoins size={18} strokeWidth={2.2} />
            </span>
            <div>
              <span className="sale-meta-label">Còn nợ</span>
              <strong className="sale-meta-debt">{formatMoney(debt)}</strong>
            </div>
          </div>
        )}
      </div>

      {sale.note && (
        <p className="sale-detail-note">{formatAmendNote(sale.note)}</p>
      )}

      <div className="accent-table-wrap sale-detail-table-wrap">
        <table className="accent-data-table sale-detail-table">
          <colgroup>
            <col className="sale-col-name" />
            <col className="sale-col-qty" />
            <col className="sale-col-price" />
            <col className="sale-col-line" />
          </colgroup>
          <thead>
            <tr>
              <th>
                <span className="th-label">
                  <Package size={15} strokeWidth={2.2} aria-hidden />
                  Hàng
                </span>
              </th>
              <th>
                <span className="th-label">
                  <Hash size={15} strokeWidth={2.2} aria-hidden />
                  SL
                </span>
              </th>
              <th>
                <span className="th-label">
                  <Tag size={15} strokeWidth={2.2} aria-hidden />
                  Đơn giá
                </span>
              </th>
              <th>
                <span className="th-label">
                  <CircleDollarSign size={15} strokeWidth={2.2} aria-hidden />
                  Thành tiền
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td className="sale-td-name">
                  <div className="sale-item-name">{it.productName}</div>
                  {it.barcode && <span className="sale-item-barcode">{it.barcode}</span>}
                </td>
                <td>
                  <span className="sale-qty-pill">{it.qty}</span>
                  {it.unitName && <span className="sale-unit">{it.unitName}</span>}
                </td>
                <td className="sale-td-money">{formatMoney(it.unitPrice)}</td>
                <td className="sale-td-line">{formatMoney(it.lineTotal)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="sale-detail-empty">
                  Hóa đơn không có dòng hàng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="sale-detail-foot">
        <div className="sale-detail-totals">
          {discount > 0 && (
            <span className="sale-total-chip discount">
              Giảm
              <strong>{formatMoney(discount)}</strong>
            </span>
          )}
          {debt > 0 && (
            <span className="sale-total-chip debt">
              Nợ
              <strong>{formatMoney(debt)}</strong>
            </span>
          )}
          <span className="sale-total-chip grand">
            Tổng
            <strong>{formatMoney(sale.totalAmount)}</strong>
          </span>
        </div>
        {!sale.cancelledAt ? (
          <div className="sale-detail-foot-actions">
            <button type="button" className="btn btn-tool" onClick={() => setConfirmAmend(true)}>
              <ShoppingCart size={16} strokeWidth={2.2} aria-hidden />
              Về phiếu mua
            </button>
            <button type="button" className="ghost ghost-danger" onClick={() => setConfirmCancel(true)}>
              <Ban size={16} strokeWidth={2.2} aria-hidden />
              Hủy hóa đơn
            </button>
          </div>
        ) : (
          <p className="sale-cancelled-note">
            <Ban size={16} strokeWidth={2.2} aria-hidden />
            Đã hủy — tồn kho đã hoàn
          </p>
        )}
      </div>

      <ConfirmDialog
        open={confirmAmend}
        title="Cập nhật hóa đơn"
        confirmLabel="Đồng ý"
        cancelLabel="Bỏ qua"
        onClose={() => setConfirmAmend(false)}
        onConfirm={goAmendCart}
      >
        <div className="sale-amend-confirm">
          <p>Khi thay đổi thông tin trên hóa đơn, hệ thống sẽ:</p>
          <ul>
            <li>Hủy hóa đơn cũ và tạo hóa đơn mới</li>
            <li>Tất cả các phiếu thanh toán của hóa đơn cũ sẽ được gắn với hóa đơn mới</li>
            <li>
              Nếu bạn thay đổi số lượng hàng hóa, cần đảm bảo tồn kho của cửa hàng vẫn đáp ứng đủ,
              hệ thống sẽ không kiểm tra lại.
            </li>
          </ul>
          <p>Bạn có muốn tiếp tục?</p>
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmCancel}
        title="Hủy hóa đơn?"
        message="Hoàn tồn kho. Nếu còn nợ chưa trả từ hóa đơn này sẽ xóa khoản nợ đó."
        confirmLabel="Hủy hóa đơn"
        danger
        busy={busy}
        onClose={() => setConfirmCancel(false)}
        onConfirm={doCancel}
      />
    </section>
  )
}
