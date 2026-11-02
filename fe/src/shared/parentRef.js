/**
 * Loại tham chiếu khi ghi nợ cá nhân (lưu trong parentName dạng "Nhãn: tên").
 * Ông+Bà, Cô+Chú, Cậu+Mợ gộp thành 3 nút.
 */
export const PARENT_REF_TYPES = [
  { value: 'PARENT', label: 'Bố mẹ', short: 'bố mẹ', prefix: 'Bố mẹ: ' },
  { value: 'GRANDPARENT', label: 'Ông bà', short: 'ông bà', prefix: 'Ông bà: ' },
  { value: 'CO_CHU', label: 'Cô chú', short: 'cô chú', prefix: 'Cô chú: ' },
  { value: 'AUNT_DI', label: 'Dì', short: 'dì', prefix: 'Dì: ' },
  { value: 'UNCLE_BAC', label: 'Bác', short: 'bác', prefix: 'Bác: ' },
  { value: 'CAU_MO', label: 'Cậu mợ', short: 'cậu mợ', prefix: 'Cậu mợ: ' },
  { value: 'SIBLING_ANH', label: 'Anh', short: 'anh', prefix: 'Anh: ' },
  { value: 'SIBLING_CHI', label: 'Chị', short: 'chị', prefix: 'Chị: ' },
  { value: 'NIECE_NEPHEW', label: 'Cháu', short: 'cháu', prefix: 'Cháu: ' },
  { value: 'DAUGHTER_IN_LAW', label: 'Dâu', short: 'dâu', prefix: 'Dâu: ' },
  { value: 'SON_IN_LAW', label: 'Rể', short: 'rể', prefix: 'Rể: ' },
  { value: 'WORKPLACE', label: 'Xưởng', short: 'xưởng', prefix: 'Xưởng: ' },
]

/** Vai trò khi ghi nợ công ty (cũng lưu trong parentName). */
export const COMPANY_REF_TYPES = [
  { value: 'COMPANY_OWNER', label: 'Chủ công ty', short: 'chủ công ty', prefix: 'Chủ công ty: ' },
  {
    value: 'COMPANY_STAFF',
    label: 'Nhân viên công ty',
    short: 'nhân viên công ty',
    prefix: 'Nhân viên công ty: ',
  },
]

/** Tiền tố cũ → loại mới (khi sửa khoản nợ đã lưu trước khi gộp nút). */
const LEGACY_PREFIX_TO_TYPE = [
  { head: 'Ông bà', type: 'GRANDPARENT' },
  { head: 'Ông', type: 'GRANDPARENT' },
  { head: 'Bà', type: 'GRANDPARENT' },
  { head: 'Cô chú', type: 'CO_CHU' },
  { head: 'Cô', type: 'CO_CHU' },
  { head: 'Chú', type: 'CO_CHU' },
  { head: 'Cậu mợ', type: 'CAU_MO' },
  { head: 'Cậu', type: 'CAU_MO' },
  { head: 'Mợ', type: 'CAU_MO' },
  { head: 'Dâu / Rể', type: 'DAUGHTER_IN_LAW' },
  { head: 'Dâu/Rể', type: 'DAUGHTER_IN_LAW' },
]

const ALL_REF_TYPES = [...PARENT_REF_TYPES, ...COMPANY_REF_TYPES]

/** Prefix dài hơn parse trước. */
const PARSE_ORDER = [...ALL_REF_TYPES].sort(
  (a, b) => b.prefix.trimEnd().length - a.prefix.trimEnd().length,
)

const LEGACY_PARSE_ORDER = [...LEGACY_PREFIX_TO_TYPE].sort(
  (a, b) => b.head.length - a.head.length,
)

export function parentRefMeta(type) {
  if (!type) return { value: '', label: '', short: '', prefix: '' }
  return ALL_REF_TYPES.find((t) => t.value === type) || PARENT_REF_TYPES[0]
}

export function isCompanyRefType(type) {
  return COMPANY_REF_TYPES.some((t) => t.value === type)
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Một lần tách tiền tố loại khỏi chuỗi đã lưu. */
function parseParentRefOnce(stored) {
  const raw = (stored || '').trim()
  if (!raw) return { type: '', name: '' }

  for (const t of PARSE_ORDER) {
    const head = t.prefix.replace(/:\s*$/, '')
    const re = new RegExp(`^${escapeRegExp(head)}\\s*:\\s*(.*)$`, 'i')
    const match = raw.match(re)
    if (match) {
      return { type: t.value, name: (match[1] || '').trim() }
    }
  }

  for (const leg of LEGACY_PARSE_ORDER) {
    const re = new RegExp(`^${escapeRegExp(leg.head)}\\s*:\\s*(.*)$`, 'i')
    const match = raw.match(re)
    if (match) {
      return { type: leg.type, name: (match[1] || '').trim() }
    }
  }

  for (const t of PARSE_ORDER) {
    const head = t.prefix.replace(/:\s*$/, '')
    if (raw.localeCompare(head, 'vi', { sensitivity: 'accent' }) === 0) {
      return { type: t.value, name: '' }
    }
    if (raw.localeCompare(t.label, 'vi', { sensitivity: 'accent' }) === 0) {
      return { type: t.value, name: '' }
    }
  }

  for (const leg of LEGACY_PARSE_ORDER) {
    if (raw.localeCompare(leg.head, 'vi', { sensitivity: 'accent' }) === 0) {
      return { type: leg.type, name: '' }
    }
  }

  return { type: '', name: raw }
}

/**
 * Tách chuỗi đã lưu → { type, name }, bỏ hết tiền tố lặp
 * (vd. "Xưởng: Xưởng: Kính" → WORKPLACE + "Kính").
 */
export function parseParentRef(stored) {
  const raw = (stored || '').trim()
  if (!raw) return { type: '', name: '' }

  let type = ''
  let name = raw
  for (let i = 0; i < 8; i++) {
    const once = parseParentRefOnce(name)
    if (!once.type) break
    type = once.type
    name = once.name
  }

  if (!type) return { type: '', name: raw }
  return { type, name }
}

/**
 * Bỏ tiền tố loại khỏi ô nhập (tránh lưu thành "Xưởng: Xưởng: …").
 * Ví dụ người dùng gõ "Xưởng Kính" / "Xưởng: Kính" khi đã chọn chip Xưởng.
 */
export function stripParentRefNameInput(type, name) {
  let n = (name || '').trim()
  if (!n) return ''

  // Gỡ các tiền tố đã lưu (kể cả lặp)
  for (let i = 0; i < 8; i++) {
    const once = parseParentRefOnce(n)
    if (!once.type) break
    n = once.name
  }

  if (!type) return n

  const meta = parentRefMeta(type)
  const label = (meta.label || '').trim()
  const short = (meta.short || '').trim()
  // Gõ "Xưởng Kính" / "xưởng kính" khi đã chọn chip Xưởng
  if (label) {
    const reLabel = new RegExp(`^${escapeRegExp(label)}\\s*[:\\-–]?\\s*`, 'i')
    n = n.replace(reLabel, '').trim()
  }
  if (short && short.localeCompare(label, 'vi', { sensitivity: 'accent' }) !== 0) {
    const reShort = new RegExp(`^${escapeRegExp(short)}\\s*[:\\-–]?\\s*`, 'i')
    n = n.replace(reShort, '').trim()
  }
  return n
}

/**
 * Ghép loại + tên để lưu DB (cột parent_name).
 * Cá nhân: có thể không chọn chip — chỉ lưu note (vd. "x4").
 * Luôn chuẩn hóa tên trước khi gắn prefix — không nhân đôi "Xưởng:".
 */
export function encodeParentRef(type, name) {
  const n = stripParentRefNameInput(type, name)
  if (!type) return n
  const meta = parentRefMeta(type)
  if (type === 'COMPANY_OWNER' || type === 'COMPANY_STAFF') {
    return n ? `${meta.prefix}${n}` : meta.label
  }
  const prefix = meta.prefix
  if (!n) return prefix.replace(/:\s*$/, '') + ':'
  return `${prefix}${n}`
}

/** Chuẩn hóa chuỗi đã lưu (sửa bản ghi bị nhân đôi tiền tố). */
export function normalizeParentRefStored(stored) {
  const raw = (stored || '').trim()
  if (!raw) return ''
  const { type, name } = parseParentRef(raw)
  if (!type) return raw
  return encodeParentRef(type, name)
}

export function formatParentRefLabel(stored) {
  const raw = (stored || '').trim()
  if (!raw) return ''
  const { type, name } = parseParentRef(raw)
  if (!type) return name || raw
  const meta = parentRefMeta(type)
  if (!name) return meta.label
  return `${meta.short} ${name}`
}

export function parentRefNameMaxLength(type) {
  if (!type) return 80
  const prefixLen = parentRefMeta(type).prefix.length
  return Math.max(20, 80 - prefixLen)
}

export function parentRefPlaceholder(type) {
  switch (type) {
    case '':
    case undefined:
    case null:
      return 'Chỉ ghi chú (vd: x4) — không bắt buộc chọn quan hệ ở trên'
    case 'COMPANY_OWNER':
    case 'COMPANY_STAFF':
      return 'Ghi chú thêm (có thể để trống)'
    case 'WORKPLACE':
      return 'Ví dụ: Kính / Hải Hưng (không gõ lại chữ Xưởng)'
    case 'GRANDPARENT':
      return 'Ví dụ: ông Tư / bà Năm (có thể để trống)'
    case 'CO_CHU':
      return 'Ví dụ: cô Lan / chú Minh (có thể để trống)'
    case 'CAU_MO':
      return 'Ví dụ: cậu Hùng / mợ Lan (có thể để trống)'
    case 'AUNT_DI':
      return 'Ví dụ: dì Lan (có thể để trống)'
    case 'UNCLE_BAC':
      return 'Ví dụ: bác Minh (có thể để trống)'
    case 'SIBLING_ANH':
    case 'SIBLING_CHI':
      return 'Ví dụ: anh Hùng (có thể để trống)'
    case 'NIECE_NEPHEW':
      return 'Ví dụ: cháu Nam (có thể để trống)'
    case 'DAUGHTER_IN_LAW':
      return 'Ví dụ: dâu Lan (có thể để trống)'
    case 'SON_IN_LAW':
      return 'Ví dụ: rể Minh (có thể để trống)'
    default:
      return 'Ví dụ: vinh (có thể để trống)'
  }
}
