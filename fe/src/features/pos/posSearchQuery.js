/**
 * Parse ô tìm POS: mã số, tên, hoặc kết hợp `123-(bánh mì)`.
 * @param {string} raw
 * @returns {{ barcode: string, name: string, kind: 'empty'|'barcode'|'text'|'compound' }}
 */
export function parsePosSearchQuery(raw) {
  const s = String(raw || '').trim()
  if (!s) return { barcode: '', name: '', kind: 'empty' }

  const compound = s.match(/^(\d+)-\((.*)$/)
  if (compound) {
    let name = compound[2]
    if (name.endsWith(')')) name = name.slice(0, -1)
    return { barcode: compound[1], name: name.trim(), kind: 'compound' }
  }

  if (/^\d+-$/.test(s)) {
    return { barcode: s.slice(0, -1), name: '', kind: 'compound' }
  }

  if (/^\d+$/.test(s)) {
    return { barcode: s, name: '', kind: 'barcode' }
  }

  return { barcode: '', name: s, kind: 'text' }
}

/**
 * Khi gõ `-` sau dãy số → chèn `()` và đặt con trỏ vào trong ngoặc.
 * @param {string} prev
 * @param {string} next
 * @returns {{ value: string, caret: number|null } | null} null = không đổi gì đặc biệt
 */
export function applyBarcodeNameShortcut(prev, next) {
  const p = String(prev ?? '')
  const n = String(next ?? '')
  if (n === p) return null

  // Gõ thêm `-` ngay sau mã số (chưa có ngoặc)
  const justDash = n.match(/^(\d+)-$/)
  if (justDash && /^\d*$/.test(p.trim()) && n.length === p.length + 1) {
    const digits = justDash[1]
    return { value: `${digits}-()`, caret: digits.length + 2 }
  }

  // Dán dạng `123-text` (không ngoặc) → chuẩn hóa thành `123-(text)`
  const loose = n.match(/^(\d+)-([^(].*)$/)
  if (loose && !n.includes('(')) {
    const digits = loose[1]
    const rest = loose[2].replace(/\)$/, '')
    return { value: `${digits}-(${rest})`, caret: digits.length + 2 + rest.length }
  }

  return null
}

/**
 * Sản phẩm có mã (chính/SKU/phụ) chứa tiền tố barcode.
 * @param {{ barcode?: string, sku?: string, barcodes?: string[] }} p
 * @param {string} barcodePrefix
 */
export function productMatchesBarcodePrefix(p, barcodePrefix) {
  const prefix = String(barcodePrefix || '').trim().toLowerCase()
  if (!prefix) return true
  const codes = [
    p?.barcode,
    p?.sku,
    ...(Array.isArray(p?.barcodes) ? p.barcodes : []),
  ]
    .filter(Boolean)
    .map((c) => String(c).toLowerCase())
  return codes.some((c) => c.includes(prefix))
}

/**
 * @param {{ barcode?: string, sku?: string, barcodes?: string[], name?: string }} p
 * @param {{ barcode: string, name: string }} parts
 */
export function productMatchesPosQuery(p, parts) {
  const nameQ = String(parts?.name || '')
    .trim()
    .toLowerCase()
  if (parts?.barcode && !productMatchesBarcodePrefix(p, parts.barcode)) return false
  if (nameQ && !String(p?.name || '').toLowerCase().includes(nameQ)) return false
  return Boolean(parts?.barcode || nameQ)
}
