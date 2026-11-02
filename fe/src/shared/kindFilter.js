/** Chọn đúng một: cá nhân | công ty | cả hai (mặc định). */
export const KIND_FILTER_ALL = 'ALL'
export const KIND_FILTER_PERSONAL = 'PERSONAL'
export const KIND_FILTER_COMPANY = 'COMPANY'

export function debtTypeFromKindFilter(kindFilter) {
  if (kindFilter === KIND_FILTER_PERSONAL) return 'PERSONAL'
  if (kindFilter === KIND_FILTER_COMPANY) return 'COMPANY'
  return ''
}

export function appendKindFilterQueryParams(params, kindFilter) {
  if (kindFilter === KIND_FILTER_PERSONAL) params.set('filterPersonal', 'true')
  else if (kindFilter === KIND_FILTER_COMPANY) params.set('filterCompany', 'true')
}

export function customerSuggestUrl(q, kindFilter, size = 8) {
  const params = new URLSearchParams({
    q,
    page: '0',
    size: String(size),
    nameOnly: 'true',
    // gồm khách hết nợ (=0, kể cả thùng rác) — ghi nợ lại / mở hồ sơ
    suggest: 'true',
  })
  appendKindFilterQueryParams(params, kindFilter)
  return `/api/customers?${params}`
}
