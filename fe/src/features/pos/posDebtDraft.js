/** Nháp ghi nợ gắn tab POS — localStorage (sống qua đóng trình duyệt). */

export const POS_PENDING_DEBT_KEY = 'taphoa-pos-pending-debt-v1'
export const POS_DEBT_FORM_DRAFTS_KEY = 'taphoa-pos-debt-form-drafts-v1'

const LEGACY_PENDING = 'taphoa-pos-pending-debt'
const LEGACY_DRAFTS = 'taphoa-pos-debt-form-drafts'

function readJson(storage, key, fallback) {
  try {
    const raw = storage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJson(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota */
  }
}

function migrateFromSessionStorage() {
  try {
    const legacyDrafts = readJson(sessionStorage, LEGACY_DRAFTS, null)
    if (legacyDrafts && typeof legacyDrafts === 'object') {
      const current = readJson(localStorage, POS_DEBT_FORM_DRAFTS_KEY, {})
      writeJson(localStorage, POS_DEBT_FORM_DRAFTS_KEY, { ...current, ...legacyDrafts })
      sessionStorage.removeItem(LEGACY_DRAFTS)
    }
    const legacyPending = readJson(sessionStorage, LEGACY_PENDING, null)
    if (legacyPending?.invoiceKey) {
      writeJson(localStorage, POS_PENDING_DEBT_KEY, legacyPending)
      sessionStorage.removeItem(LEGACY_PENDING)
    }
  } catch {
    /* ignore */
  }
}

migrateFromSessionStorage()

export function posCartSignature(items) {
  return (items || [])
    .map((it) => `${it.productId}:${it.unitId ?? ''}:${it.variantId ?? ''}:${Number(it.qty) || 1}`)
    .sort()
    .join('|')
}

function readAllDrafts() {
  return readJson(localStorage, POS_DEBT_FORM_DRAFTS_KEY, {})
}

function writeAllDrafts(all) {
  writeJson(localStorage, POS_DEBT_FORM_DRAFTS_KEY, all)
}

export function readDebtFormDraft(invoiceKey) {
  if (!invoiceKey) return null
  const d = readAllDrafts()[invoiceKey]
  return d && typeof d === 'object' ? d : null
}

export function saveDebtFormDraft(invoiceKey, form, cartItems) {
  if (!invoiceKey || !form) return
  const all = readAllDrafts()
  all[invoiceKey] = {
    debtType: form.debtType || '',
    customerName: form.customerName || '',
    parentRefType: form.parentRefType || '',
    parentName: form.parentName || '',
    pickerName: form.pickerName || '',
    occurredAt: form.occurredAt || '',
    cartSignature: posCartSignature(cartItems),
    updatedAt: Date.now(),
  }
  writeAllDrafts(all)
}

export function clearDebtFormDraft(invoiceKey) {
  if (!invoiceKey) return
  const all = readAllDrafts()
  if (!all[invoiceKey]) return
  delete all[invoiceKey]
  writeAllDrafts(all)
}

export function posDebtFormDraftExists(invoiceKey) {
  return Boolean(readDebtFormDraft(invoiceKey)?.debtType)
}

/** Xóa nháp tab POS không còn tồn tại */
export function pruneStaleDebtDrafts(invoiceKeys) {
  const keep = new Set(invoiceKeys || [])
  const all = readAllDrafts()
  let changed = false
  for (const key of Object.keys(all)) {
    if (!keep.has(key)) {
      delete all[key]
      changed = true
    }
  }
  if (changed) writeAllDrafts(all)
}

export function savePosPendingDebt(meta) {
  if (!meta?.invoiceKey) return
  writeJson(localStorage, POS_PENDING_DEBT_KEY, meta)
}

export function readPosPendingDebt() {
  const p = readJson(localStorage, POS_PENDING_DEBT_KEY, null)
  return p?.invoiceKey ? p : null
}

export function clearPosPendingDebt() {
  try {
    localStorage.removeItem(POS_PENDING_DEBT_KEY)
  } catch {
    /* ignore */
  }
}

export function isCartChangedSinceDraft(invoiceKey, cartItems) {
  const draft = readDebtFormDraft(invoiceKey)
  if (!draft?.cartSignature) return false
  return draft.cartSignature !== posCartSignature(cartItems)
}
