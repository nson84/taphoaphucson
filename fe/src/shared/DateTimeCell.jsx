import { formatDate, formatTime } from './format'

export default function DateTimeCell({ value }) {
  if (!value) return '—'
  return (
    <span className="datetime-cell">
      <span className="datetime-time">{formatTime(value)}</span>
      <span className="datetime-date">{formatDate(value)}</span>
    </span>
  )
}
