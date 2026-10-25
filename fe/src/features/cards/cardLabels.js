export const TELCO_LABEL = {
  VIETTEL: 'Viettel',
  MOBIFONE: 'Mobifone',
  VINAPHONE: 'Vinaphone',
}

export function statusLabel(s) {
  const map = {
    PENDING: 'Chờ thanh toán',
    PAID: 'Đã thanh toán — chờ giao mã',
    REVIEW: 'Đang duyệt VTC',
    FAILED: 'Thanh toán thất bại',
    DELIVERED: 'Đã giao mã',
    CANCELLED: 'Đã hủy',
  }
  return map[s] || s
}

export function statusClass(s) {
  if (s === 'DELIVERED' || s === 'PAID') return 'status-paid'
  if (s === 'FAILED' || s === 'CANCELLED') return 'status-unpaid'
  return 'status-unpaid'
}
