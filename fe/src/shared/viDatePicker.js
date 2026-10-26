import { format, getDaysInMonth, isValid, parse } from 'date-fns'
import { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('vi', vi)

export const datePickerViProps = {
  locale: 'vi',
  dateFormat: 'dd/MM/yyyy',
  calendarStartDay: 1,
  // Không chấp nhận ngày "tràn" kiểu 32/01 → 01/02
  strictParsing: true,
}

/** Parse nghiêm: format phải khớp tuyệt đối, không cho ngày 32 nhảy sang tháng sau. */
export function parseStrictDisplayDate(text, formatStr = 'dd/MM/yyyy') {
  const trimmed = String(text || '').trim()
  if (!trimmed) return null
  const parsed = parse(trimmed, formatStr, new Date())
  if (!isValid(parsed)) return null
  if (format(parsed, formatStr) !== trimmed) return null
  return parsed
}

export function daysInMonth(year, month1to12) {
  if (!year || !month1to12 || month1to12 < 1 || month1to12 > 12) return 31
  return getDaysInMonth(new Date(year, month1to12 - 1, 1))
}

export function parseYmd(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
  const date = new Date(y, m - 1, d)
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
    return null
  }
  return date
}

export function toYmd(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseYm(value) {
  if (!value) return null
  const [y, m] = value.split('-').map(Number)
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return null
  return new Date(y, m - 1, 1)
}

export function toYm(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`
}

export function parseYear(value) {
  if (!value) return null
  const y = Number(value)
  if (!Number.isInteger(y)) return null
  return new Date(y, 0, 1)
}

export function toYear(date) {
  if (!date) return ''
  return String(date.getFullYear())
}

export function parseDateTimeLocal(value) {
  if (!value) return null
  const [datePart, timePart = '00:00'] = value.split('T')
  if (!datePart) return null
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh = 0, mm = 0] = timePart.split(':').map(Number)
  if (!Number.isInteger(y) || !Number.isInteger(m) || !Number.isInteger(d)) return null
  if (m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return null
  if (!Number.isInteger(hh) || !Number.isInteger(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null
  }
  const date = new Date(y, m - 1, d, hh, mm)
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d ||
    date.getHours() !== hh ||
    date.getMinutes() !== mm
  ) {
    return null
  }
  return date
}

export function toDateTimeLocal(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** Hiển thị giống DatePicker: dd/MM/yyyy HH:mm */
export function formatOccurredDisplay(occurredAtLocal) {
  const date = parseDateTimeLocal(occurredAtLocal)
  if (!date) return ''
  return format(date, 'dd/MM/yyyy HH:mm')
}

/**
 * Chỉ nhận ngày hợp lệ từ DatePicker.
 * onChange(null) khi gõ dở/sai → giữ giá trị cũ, không nhảy ngày.
 */
export function acceptValidDateChange(date, onValid) {
  if (!date || Number.isNaN(date.getTime())) return false
  onValid(date)
  return true
}
