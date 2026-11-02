import {
  Ban,
  Banknote,
  CreditCard,
  HandCoins,
  Landmark,
  Split,
  Wallet,
} from 'lucide-react'
import { formatSalePayment } from './paymentLabels'

const VISUAL = {
  CASH: { icon: Banknote, tone: 'cash' },
  TRANSFER: { icon: Landmark, tone: 'transfer' },
  CARD: { icon: CreditCard, tone: 'card' },
  WALLET: { icon: Wallet, tone: 'wallet' },
  DEBT: { icon: HandCoins, tone: 'debt' },
  MIXED: { icon: Split, tone: 'mixed' },
}

function resolveVisual({ paymentMethod, debtAmount, cancelledAt }) {
  if (cancelledAt) return { icon: Ban, tone: 'cancelled' }
  const method = String(paymentMethod || 'CASH').toUpperCase()
  const debt = Number(debtAmount) || 0
  if (method === 'MIXED' || (debt > 0 && method !== 'DEBT')) return VISUAL.MIXED
  return VISUAL[method] || VISUAL.CASH
}

/** Badge thanh toán có icon (tiền mặt / CK / thẻ / nợ / đã hủy…). */
export default function SalePayBadge({ paymentMethod, debtAmount, cancelledAt, compact = false }) {
  const { icon: Icon, tone } = resolveVisual({ paymentMethod, debtAmount, cancelledAt })
  const label = formatSalePayment({ paymentMethod, debtAmount, cancelledAt })
  return (
    <span className={`sale-pay-badge${compact ? ' is-compact' : ''} ${tone}`}>
      <Icon size={compact ? 14 : 16} strokeWidth={2.2} aria-hidden />
      {label}
    </span>
  )
}
