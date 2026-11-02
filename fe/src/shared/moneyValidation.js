/** Quy tắc số tiền thống nhất với backend: tối thiểu 1.000 đ, bước 500 đ (1,000 / 1,500). */
export const MONEY_MIN = 1000
export const MONEY_STEP = 500
export const MONEY_MAX_DEBT = 10_000_000
export const DEBT_UNDER_MIN_MESSAGE = 'Khoản nợ không thể dưới 1.000 đ'
export const PAY_UNDER_MIN_MESSAGE = 'Số tiền trả nợ phải trên 1.000 đ'
export const MONEY_FORM_MESSAGE = 'Số tiền của bạn chỉ được dưới dạng 1,000 hoặc 1,500'

/** @returns {string} rỗng nếu hợp lệ */
export function debtAmountError(amount) {
  if (!Number.isFinite(amount) || amount < MONEY_MIN) return DEBT_UNDER_MIN_MESSAGE
  if (!Number.isInteger(amount) || amount % MONEY_STEP !== 0) return MONEY_FORM_MESSAGE
  return ''
}

/**
 * @param {string|number} rawDigits - chuỗi chỉ gồm chữ số hoặc số
 * @returns {{ ok: true, amount: number } | { ok: false, message: string }}
 */
export function validateDebtAmount(rawDigits) {
  if (rawDigits === '' || rawDigits == null) {
    return { ok: false, message: 'Số tiền nợ không được trống' }
  }
  const amount = Number(rawDigits)
  if (!Number.isFinite(amount) || amount < 0) {
    return { ok: false, message: 'Số tiền không được âm' }
  }
  const shapeError = debtAmountError(amount)
  if (shapeError) return { ok: false, message: shapeError }
  if (amount > MONEY_MAX_DEBT) {
    return { ok: false, message: 'Số tiền nợ tối đa là 10.000.000 đ' }
  }
  return { ok: true, amount }
}

/**
 * Số tiền khách trả (có thể lớn hơn 1 khoản, không giới hạn 10 triệu/khoản).
 * @param {string|number} rawDigits
 * @param {{ maxBalance?: number }} [opts]
 */
export function validatePayAmount(rawDigits, opts = {}) {
  if (rawDigits === '' || rawDigits == null) {
    return { ok: false, message: 'Nhập số tiền khách muốn trả' }
  }
  const amount = Number(rawDigits)
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: 'Nhập số tiền khách muốn trả' }
  }
  if (amount < MONEY_MIN) {
    return { ok: false, message: PAY_UNDER_MIN_MESSAGE }
  }
  if (!Number.isInteger(amount) || amount % MONEY_STEP !== 0) {
    return { ok: false, message: MONEY_FORM_MESSAGE }
  }
  const maxBalance = opts.maxBalance
  if (maxBalance != null && Number.isFinite(maxBalance) && amount > maxBalance) {
    return {
      ok: false,
      message: `Số tiền không được lớn hơn tổng còn nợ`,
      amount,
      exceedBalance: true,
    }
  }
  return { ok: true, amount }
}
