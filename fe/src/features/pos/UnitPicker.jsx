import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Chọn đơn vị tính trên dòng giỏ hàng POS: nút viên thuốc (chữ trắng, nền hồng đậm) + menu bo tròn
 * sổ ra bên phải. Menu render qua portal/fixed để không bị bảng giỏ hàng (overflow: auto) cắt.
 */
export default function UnitPicker({ units, value, onChange }) {
  const [open, setOpen] = useState(false)
  const [anchor, setAnchor] = useState(null)
  const [coords, setCoords] = useState({ top: 0, left: 0, ready: false })
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const listId = useId()

  const current =
    units.find((u) => String(u.id ?? '') === String(value ?? '')) || units[0] || { name: '—' }

  function toggle(e) {
    e.preventDefault()
    e.stopPropagation()
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (!rect) return
    setAnchor(rect)
    setCoords({ top: rect.top, left: rect.right + 8, ready: false })
    setOpen(true)
  }

  // Đo menu rồi đặt vị trí: ưu tiên bên phải nút; hết chỗ thì sang trái; không tràn đáy màn hình
  useLayoutEffect(() => {
    if (!open || !anchor || !menuRef.current) return
    const { width, height } = menuRef.current.getBoundingClientRect()
    let left = anchor.right + 8
    if (left + width > window.innerWidth - 8) left = Math.max(8, anchor.left - width - 8)
    let top = anchor.top
    if (top + height > window.innerHeight - 8) top = Math.max(8, window.innerHeight - height - 8)
    setCoords({ top, left, ready: true })
  }, [open, anchor])

  useEffect(() => {
    if (!open) return undefined
    const close = () => setOpen(false)
    const onDown = (e) => {
      if (menuRef.current?.contains(e.target) || btnRef.current?.contains(e.target)) return
      close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        close()
        btnRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  function pick(u) {
    setOpen(false)
    if (String(u.id ?? '') !== String(current.id ?? '')) onChange(u.id ?? null)
    btnRef.current?.focus()
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`unit-picker-trigger${open ? ' is-open' : ''}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={toggle}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="unit-picker-label">{current.name}</span>
        <ChevronDown size={16} strokeWidth={2.5} aria-hidden className="unit-picker-chevron" />
      </button>
      {open &&
        createPortal(
          <ul
            ref={menuRef}
            id={listId}
            role="listbox"
            className="unit-picker-menu"
            style={{
              top: coords.top,
              left: coords.left,
              visibility: coords.ready ? 'visible' : 'hidden',
            }}
          >
            {units.map((u) => {
              const selected = String(u.id ?? '') === String(current.id ?? '')
              return (
                <li key={u.id ?? u.name} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={`unit-picker-option${selected ? ' is-selected' : ''}`}
                    onClick={() => pick(u)}
                  >
                    {u.name}
                  </button>
                </li>
              )
            })}
          </ul>,
          document.body,
        )}
    </>
  )
}
