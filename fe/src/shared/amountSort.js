export const AMOUNT_SORT_DESC = 'amountDesc'
export const AMOUNT_SORT_ASC = 'amountAsc'

export function toggleAmountSort(current) {
  return current === AMOUNT_SORT_DESC ? AMOUNT_SORT_ASC : AMOUNT_SORT_DESC
}

export function amountSortLabel(sort) {
  return sort === AMOUNT_SORT_DESC ? 'Giá: cao → thấp' : 'Giá: thấp → cao'
}
