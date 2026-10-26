import { useId, useState } from 'react'

/** Ô bảng: thu gọn khi dài; hover sáng xanh; bấm → popup đủ nội dung. */
export default function ExpandableTextCell({ value, title = 'Chi tiết' }) {
  const [open, setOpen] = useState(false)
  const dialogTitleId = useId()
  const text = value == null ? '' : String(value).trim()

  if (!text) return '—'

  return (
    <>
      <button
        type="button"
        className="product-note-chip"
        title="Bấm để xem đầy đủ"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
      >
        <span className="product-note-chip-text">{text}</span>
      </button>

      {open && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(false)
          }}
        >
          <div
            className="modal-card product-note-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id={dialogTitleId}>{title}</h2>
            <p className="product-note-full">{text}</p>
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={() => setOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
