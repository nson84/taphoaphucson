/** Nhãn tiếng Việt cho mã hình thức thanh toán (API enum PaymentMethod). */
export const PAYMENT_METHOD_LABELS = {
  CASH: 'Tiền mặt',
  TRANSFER: 'Chuyển khoản',
  CARD: 'Thẻ',
  WALLET: 'Ví điện tử',
  DEBT: 'Nợ',
  MIXED: 'Trả một phần + nợ',
}

export function paymentMethodLabel(code) {
  if (code == null || code === '') return '—'
  const key = String(code).trim().toUpperCase()
  return PAYMENT_METHOD_LABELS[key] || String(code)
}

/** Hiển thị cột / tóm tắt thanh toán trên hóa đơn bán. */
export function formatSalePayment({ paymentMethod, debtAmount, cancelledAt }) {
  if (cancelledAt) return 'Đã hủy'
  const base = paymentMethodLabel(paymentMethod)
  const debt = Number(debtAmount) || 0
  const method = String(paymentMethod || '').toUpperCase()
  if (method === 'MIXED' || method === 'DEBT') return base
  if (debt > 0) return `${base} + nợ`
  return base
}
