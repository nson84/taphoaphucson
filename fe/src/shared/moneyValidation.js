/** Quy tắc số tiền thống nhất với backend (đồng, tròn nghìn). */
export const MONEY_MIN = 1000
export const MONEY_MAX_DEBT = 10_000_000

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
  if (!Number.isInteger(amount) || amount < MONEY_MIN) {
    return { ok: false, message: 'Số tiền nợ tối thiểu là 1.000 đ' }
  }
  if (amount > MONEY_MAX_DEBT) {
    return { ok: false, message: 'Số tiền nợ tối đa là 10.000.000 đ' }
  }
  if (amount % 1000 !== 0) {
    return {
      ok: false,
      message: 'Số tiền phải là số tròn nghìn (ví dụ 1.000, 2.000 — không nhập 1.001)',
    }
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
  if (!Number.isInteger(amount) || amount < MONEY_MIN) {
    return { ok: false, message: 'Số tiền trả tối thiểu là 1.000 đ' }
  }
  if (amount % 1000 !== 0) {
    return { ok: false, message: 'Số tiền trả phải là bội số của 1.000 đ' }
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
