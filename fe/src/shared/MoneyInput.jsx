import { useLayoutEffect, useRef } from 'react'
import { formatMoneyInput, parseMoneyInput } from './format'

const SUFFIX = ' đ'

/**
 * Ô nhập tiền: gõ 5000 → hiển thị "5,000 đ" ngay trong ô.
 * `value` là chuỗi chữ số thô ("5000"); `onValueChange` nhận lại chuỗi chữ số.
 * Con trỏ luôn nằm trước chữ " đ" nên gõ/xóa số bình thường.
 */
export default function MoneyInput({ value, onValueChange, maxDigits = 12, ...rest }) {
  const ref = useRef(null)
  const pendingDigitsRef = useRef(null)
  const text = value ? `${formatMoneyInput(value)}${SUFFIX}` : ''

  // Đặt lại con trỏ sau khi định dạng lại (số chữ số bên trái con trỏ được giữ nguyên)
  useLayoutEffect(() => {
    const el = ref.current
    const pending = pendingDigitsRef.current
    pendingDigitsRef.current = null
    if (!el || pending == null || document.activeElement !== el) return
    let seen = 0
    let pos = 0
    if (pending > 0) {
      for (let i = 0; i < text.length; i += 1) {
        if (/\d/.test(text[i])) seen += 1
        if (seen === pending) {
          pos = i + 1
          break
        }
      }
    }
    el.setSelectionRange(pos, pos)
  }, [text])

  function clampSelection() {
    const el = ref.current
    if (!el || !text) return
    const end = text.length - SUFFIX.length
    const start = el.selectionStart ?? 0
    const stop = el.selectionEnd ?? 0
    if (start > end || stop > end) el.setSelectionRange(Math.min(start, end), Math.min(stop, end))
  }

  function handleChange(e) {
    const raw = e.target.value
    const caret = e.target.selectionStart ?? raw.length
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length
    const digits = parseMoneyInput(raw).slice(0, maxDigits)
    pendingDigitsRef.current = Math.min(digitsBefore, digits.length)
    onValueChange(digits)
  }

  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={handleChange}
      onSelect={clampSelection}
      onFocus={() => setTimeout(clampSelection, 0)}
    />
  )
}
