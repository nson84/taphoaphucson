/** Giá bán / đơn giá bán: chỉ chấp nhận bội số của 500đ. */
export const SELL_PRICE_STEP = 500

export function isSellPriceValid(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return false
  return Math.round(n) % SELL_PRICE_STEP === 0
}

export function sellPriceError(value) {
  if (isSellPriceValid(value)) return ''
  const n = Number(value)
  const shown = Number.isFinite(n) ? n.toLocaleString('en-US') : String(value ?? '')
  return `Chỉ nhận tiền làm tròn như 20,000 hoặc 20,500 (bội 500 đ). Không chấp nhận ${shown}`
}

/** Làm tròn tới bội 500 gần nhất (ưu tiên lên khi đúng giữa). */
export function snapSellPrice(value) {
  const n = Number(value) || 0
  if (n <= 0) return 0
  return Math.round(n / SELL_PRICE_STEP) * SELL_PRICE_STEP
}

export function stepSellPrice(value, deltaSteps = 1) {
  const n = Number(value) || 0
  const base = isSellPriceValid(n) ? n : snapSellPrice(n)
  return Math.max(0, base + deltaSteps * SELL_PRICE_STEP)
}
