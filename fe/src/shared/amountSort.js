export const AMOUNT_SORT_DESC = 'amountDesc'
export const AMOUNT_SORT_ASC = 'amountAsc'
export const DATE_SORT_DESC = 'dateDesc'
export const DATE_SORT_ASC = 'dateAsc'

export function toggleAmountSort(current) {
  return current === AMOUNT_SORT_DESC ? AMOUNT_SORT_ASC : AMOUNT_SORT_DESC
}

export function amountSortLabel(sort) {
  return sort === AMOUNT_SORT_DESC ? 'Giá: cao → thấp' : 'Giá: thấp → cao'
}

export function toggleDateSort(current) {
  return current === DATE_SORT_DESC ? DATE_SORT_ASC : DATE_SORT_DESC
}

export function dateSortLabel(sort) {
  return sort === DATE_SORT_ASC ? 'Ngày: cũ → mới' : 'Ngày: mới → cũ'
}
