/** @param {number} page — 0-based */
function buildPageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({ type: 'page', value: i }))
  }

  const items = []
  const show = new Set()

  show.add(0)
  show.add(totalPages - 1)

  for (let i = page - 1; i <= page + 1; i += 1) {
    if (i >= 0 && i < totalPages) show.add(i)
  }

  if (page <= 2) {
    for (let i = 0; i <= 3 && i < totalPages; i += 1) show.add(i)
  }
  if (page >= totalPages - 3) {
    for (let i = totalPages - 4; i < totalPages; i += 1) {
      if (i >= 0) show.add(i)
    }
  }

  const sorted = [...show].sort((a, b) => a - b)
  let prev = -1
  for (const p of sorted) {
    if (prev >= 0 && p - prev > 1) {
      items.push({ type: 'ellipsis', key: `gap-${prev}-${p}` })
    }
    items.push({ type: 'page', value: p })
    prev = p
  }
  return items
}

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  const atStart = page <= 0
  const atEnd = page + 1 >= totalPages
  const items = buildPageItems(page, totalPages)

  return (
    <nav className="pagination" aria-label="Phân trang">
      <button
        type="button"
        className="pagination-nav"
        disabled={atStart}
        aria-label="Trang đầu"
        onClick={() => onChange(0)}
      >
        «
      </button>
      <button
        type="button"
        className="pagination-nav"
        disabled={atStart}
        aria-label="Trang trước"
        onClick={() => onChange(page - 1)}
      >
        ‹
      </button>

      {items.map((item) =>
        item.type === 'ellipsis' ? (
          <span key={item.key} className="pagination-ellipsis" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={item.value}
            type="button"
            className={`pagination-page${item.value === page ? ' pagination-page--active' : ''}`}
            aria-label={`Trang ${item.value + 1}`}
            aria-current={item.value === page ? 'page' : undefined}
            onClick={() => onChange(item.value)}
          >
            {item.value + 1}
          </button>
        ),
      )}

      <button
        type="button"
        className="pagination-nav"
        disabled={atEnd}
        aria-label="Trang sau"
        onClick={() => onChange(page + 1)}
      >
        ›
      </button>
      <button
        type="button"
        className="pagination-nav"
        disabled={atEnd}
        aria-label="Trang cuối"
        onClick={() => onChange(totalPages - 1)}
      >
        »
      </button>
    </nav>
  )
}
