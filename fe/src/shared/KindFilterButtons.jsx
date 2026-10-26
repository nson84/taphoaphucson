import {
  KIND_FILTER_ALL,
  KIND_FILTER_COMPANY,
  KIND_FILTER_PERSONAL,
} from './kindFilter'

const OPTIONS = [
  { value: KIND_FILTER_PERSONAL, label: 'Cá nhân' },
  { value: KIND_FILTER_COMPANY, label: 'Công ty' },
  { value: KIND_FILTER_ALL, label: 'Cả cá nhân và công ty' },
]

export default function KindFilterButtons({ value, onChange }) {
  return (
    <div className="filter-kind-group" role="radiogroup" aria-label="Lọc loại khách">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          className={`filter-kind-btn${value === opt.value ? ' is-active' : ''}`}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
