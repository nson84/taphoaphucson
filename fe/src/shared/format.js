export function formatMoney(value) {
  const n = Number(value)
  if (value == null || Number.isNaN(n)) return '0 đ'
  return `${Math.round(n).toLocaleString('en-US')} đ`
}

/** Hiển thị lúc gõ: 5000 -> 5,000 */
export function formatMoneyInput(rawDigits) {
  if (!rawDigits) return ''
  const digits = String(rawDigits).replace(/\D/g, '')
  if (!digits) return ''
  return Number(digits).toLocaleString('en-US')
}

export function parseMoneyInput(text) {
  return String(text || '').replace(/\D/g, '')
}

export function nowVietnamLocalInput() {
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
  )
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export function formatDateTime(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleDateString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatTime(value) {
  if (!value) return ''
  const d = new Date(value)
  return d.toLocaleTimeString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

export function toApiDateTime(localInput) {
  if (!localInput) return null
  return localInput.length === 16 ? `${localInput}:00` : localInput
}
