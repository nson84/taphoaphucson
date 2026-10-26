import { formatParentRefLabel } from './parentRef'

/**
 * Hiển thị tên khách:
 * - Công ty → An phú khang (công ty)
 * - Cá nhân + loại (không tên) → Thơm Doanh(Bác)
 * - Cá nhân + loại + tên → An(bố mẹ vinh) / An(xưởng …)
 * - Cá nhân không tham chiếu → An
 */
export function formatCustomerDisplayName(name, parentName, isCompany = false) {
  const n = (name || '').trim()
  if (!n) return '—'
  if (isCompany) return `${n} (công ty)`
  const ref = formatParentRefLabel(parentName)
  if (!ref) return n
  return `${n}(${ref})`
}
