/** Đếm tab POS còn hàng chưa thanh toán (nháp localStorage). */
export const POS_STORAGE_KEY = 'taphoa-pos-state-v1'

export function countUnpaidPosInvoices() {
  try {
    const s = JSON.parse(localStorage.getItem(POS_STORAGE_KEY) || 'null')
    if (!s || !Array.isArray(s.invoices)) return 0
    return s.invoices.filter((inv) => Array.isArray(inv.items) && inv.items.length > 0).length
  } catch {
    return 0
  }
}
