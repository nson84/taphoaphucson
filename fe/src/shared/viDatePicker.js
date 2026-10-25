import { registerLocale } from 'react-datepicker'
import { vi } from 'date-fns/locale'
import 'react-datepicker/dist/react-datepicker.css'

registerLocale('vi', vi)

export const datePickerViProps = {
  locale: 'vi',
  dateFormat: 'dd/MM/yyyy',
  calendarStartDay: 1,
}

export function parseYmd(value) {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function toYmd(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function parseYm(value) {
  if (!value) return null
  const [y, m] = value.split('-').map(Number)
  if (!y || !m) return null
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
  const [y, m, d] = datePart.split('-').map(Number)
  const [hh, mm] = timePart.split(':').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, hh || 0, mm || 0)
}

export function toDateTimeLocal(date) {
  if (!date) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
