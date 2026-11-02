/**
 * Quy tắc làm tròn tổng hóa đơn (khớp BE `SaleService.roundingFor`):
 * tiền mặt, ghi nợ (và hỗn hợp) làm tròn LÊN 1.000 đ vì không còn tiền 500 đ — 10.500 → 11.000.
 * Chuyển khoản giữ nguyên.
 */
export const ROUNDING_STEP = 1000

const ROUNDING_METHODS = new Set(['CASH', 'DEBT', 'MIXED'])

export function roundingFor(method, amount) {
  const n = Number(amount) || 0
  if (!ROUNDING_METHODS.has(method) || n <= 0) return 0
  const remainder = n % ROUNDING_STEP
  return remainder === 0 ? 0 : ROUNDING_STEP - remainder
}
