import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Banknote,
  NotebookPen,
  Plus,
  ScanBarcode,
  Trash2,
  X,
} from 'lucide-react'
import { api } from '../../shared/api'
import ConfirmDialog from '../../shared/ConfirmDialog'
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../../shared/format'
import { printReceipt } from '../../shared/print'
import { createRequestIdHolder } from '../../shared/requestId'
import { resolveSaleUnitId } from './saleUnit'
import { roundingFor } from './cashRounding'
import { debtAmountError } from '../../shared/moneyValidation'
import UnitPicker from './UnitPicker'
import NoBarcodePickerDialog from './NoBarcodePickerDialog'
import {
  isSellPriceValid,
  sellPriceError,
  snapSellPrice,
} from '../../shared/priceStep'
import { useAuth } from '../auth/AuthContext'
import { useToast } from '../../shared/ToastContext'
import {
  clearDebtFormDraft,
  clearPosPendingDebt,
  posDebtFormDraftExists,
  pruneStaleDebtDrafts,
  readPosPendingDebt,
  savePosPendingDebt,
} from './posDebtDraft'
import { usePosBarcodeWedge } from './usePosBarcodeWedge'
import { POS_STORAGE_KEY } from './posDraftStats'
import {
  applyBarcodeNameShortcut,
  parsePosSearchQuery,
  productMatchesPosQuery,
} from './posSearchQuery'

let tabSeq = 1
let lineSeq = 1

function keySeqNum(key) {
  const n = Number(String(key || '').replace(/^inv-/, '').split('-')[0])
  return Number.isFinite(n) ? n : 0
}

function bumpSeqFromInvoices(list) {
  for (const inv of list || []) {
    const n = keySeqNum(inv.key)
    if (n >= tabSeq) tabSeq = n + 1
    for (const it of inv.items || []) {
      const ln = Number(String(it.lineId || '').replace(/^L/, '').split('-')[0])
      if (Number.isFinite(ln) && ln >= lineSeq) lineSeq = ln + 1
    }
  }
}

function normUnitName(unitName) {
  return String(unitName || 'Cái')
    .trim()
    .toLowerCase()
}

function normUnitId(unitId) {
  if (unitId == null || unitId === '') return null
  return String(unitId)
}

/**
 * Khóa gộp dòng: cùng hàng + cùng đơn vị.
 * id đơn vị null vs số (API/gợi ý lệch) vẫn gộp nếu tên đơn vị trùng — tránh spam + STT loạn.
 */
function cartLineMergeKey(productId, unitId, unitName) {
  const pid = String(productId)
  const uid = normUnitId(unitId)
  const name = normUnitName(unitName)
  if (uid != null) return `${pid}::id:${uid}`
  return `${pid}::name:${name}`
}

/** Hai dòng cùng hàng+đơn vị+kiểu? (chấp nhận một bên thiếu unitId). */
function sameCartLine(a, productId, unitId, unitName, variantId = null) {
  if (a == null || productId == null) return false
  if (String(a.productId) !== String(productId)) return false
  const aVid = a.variantId != null && a.variantId !== '' ? String(a.variantId) : ''
  const bVid = variantId != null && variantId !== '' ? String(variantId) : ''
  if (aVid !== bVid) return false
  const aUid = normUnitId(a.unitId)
  const bUid = normUnitId(unitId)
  if (aUid != null && bUid != null) return aUid === bUid
  return normUnitName(a.unitName) === normUnitName(unitName)
}

function nextLineId() {
  return `L${lineSeq++}-${Date.now().toString(36)}`
}

/** Gộp dòng trùng cùng hàng + đơn vị (race quét mã / lệch unitId / lineId trùng). */
function coalesceCartItemsStatic(items) {
  const out = []
  const seenLineIds = new Set()
  for (const it of items || []) {
    if (!it || it.productId == null) continue
    const existing = out.find((row) =>
      sameCartLine(row, it.productId, it.unitId, it.unitName, it.variantId),
    )
    if (existing) {
      existing.qty = (Number(existing.qty) || 0) + (Number(it.qty) || 0)
      if (!(existing.units || []).length && (it.units || []).length) {
        existing.units = it.units
      }
      if (normUnitId(existing.unitId) == null && normUnitId(it.unitId) != null) {
        existing.unitId = it.unitId
      }
      continue
    }
    let lineId = it.lineId
    if (!lineId || seenLineIds.has(lineId)) {
      lineId = nextLineId()
    }
    seenLineIds.add(lineId)
    out.push({ ...it, lineId })
  }
  return out
}

/** Tách key trùng (HMR / localStorage cũ) — mỗi hóa đơn một key riêng, items clone. */
function normalizeInvoices(list) {
  const seen = new Set()
  const out = []
  for (const inv of list || []) {
    let key = inv.key
    if (!key || seen.has(key)) {
      key = `inv-${tabSeq++}`
    }
    seen.add(key)
    out.push({
      ...inv,
      key,
      items: coalesceCartItemsStatic(
        Array.isArray(inv.items) ? inv.items.map((it) => ({ ...it })) : [],
      ),
    })
  }
  bumpSeqFromInvoices(out)
  return out
}

function loadSaved() {
  try {
    const s = JSON.parse(localStorage.getItem(POS_STORAGE_KEY) || 'null')
    if (!s || !Array.isArray(s.invoices) || s.invoices.length === 0) return null
    const invoices = normalizeInvoices(s.invoices)
    const unpaid = invoices.filter((i) => (i.items || []).length > 0)
    // Ưu tiên mở tab còn hàng chưa thanh toán (không để dính tab trống)
    let activeKey = invoices.some((i) => i.key === s.activeKey) ? s.activeKey : invoices[0]?.key
    const activeHasItems = invoices.some(
      (i) => i.key === activeKey && (i.items || []).length > 0,
    )
    if (unpaid.length > 0 && !activeHasItems) {
      activeKey = unpaid[0].key
    }
    return { ...s, invoices, activeKey }
  } catch {
    return null
  }
}

function newInvoice(n) {
  return {
    key: `inv-${tabSeq++}`,
    title: `Hóa đơn ${n}`,
    items: [],
    note: '',
    customerName: '',
    customerId: null,
    discount: 0,
    paymentMethod: 'CASH',
    paidInput: '',
    /** Khi sửa từ lịch sử: hủy hóa đơn này lúc thanh toán và tạo mới */
    amendSaleId: null,
    amendSaleCode: null,
  }
}

/** Dựng dòng giỏ từ chi tiết hóa đơn đã bán. */
function cartItemsFromSale(sale) {
  return coalesceCartItemsStatic(
    (sale.items || [])
      .filter((it) => it.productId != null)
      .map((it) => ({
        lineId: nextLineId(),
        productId: it.productId,
        barcode: it.barcode || '',
        name: it.productName || 'Hàng',
        qty: Number(it.qty) || 1,
        unitId: it.productUnitId ?? null,
        unitName: it.unitName || 'Cái',
        unitFactor: Number(it.unitFactor) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        units: [
          {
            id: it.productUnitId ?? null,
            name: it.unitName || 'Cái',
            factor: Number(it.unitFactor) || 1,
            sellPrice: Number(it.unitPrice) || 0,
            costPrice: Number(it.costPrice) || 0,
            base: true,
          },
        ],
      })),
  )
}

function discountPerUnit(item) {
  const price = Number(item.unitPrice) || 0
  const v = Number(item.discountValue) || 0
  const d = item.discountType === 'PERCENT' ? Math.round((price * Math.min(v, 100)) / 100) : v
  return Math.min(Math.max(d, 0), price)
}

/** Giá bán thực tế sau giảm giá dòng (đơn giá - giảm giá). */
function sellPrice(item) {
  return (Number(item.unitPrice) || 0) - discountPerUnit(item)
}

function lineTotal(item) {
  return (Number(item.qty) || 0) * sellPrice(item)
}

/** Ghi chú nợ: mỗi mặt hàng một dòng "-Tên xSL". */
function buildDebtProductNote(items) {
  return (items || [])
    .map((it) => `-${(it.name || 'Hàng').trim()} x${Number(it.qty) || 1}`)
    .join('\n')
}

export default function PosPage() {
  const { username } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const searchRef = useRef(null)
  const [saved] = useState(loadSaved)
  const [invoices, setInvoices] = useState(() => saved?.invoices || [newInvoice(1)])
  const [activeKey, setActiveKey] = useState(
    () => saved?.activeKey || saved?.invoices?.[0]?.key || `inv-1`,
  )
  const [q, setQ] = useState('')
  const [suggest, setSuggest] = useState([])
  const [showSuggest, setShowSuggest] = useState(false)
  /** Mã vạch vừa quét không có trong hệ thống — hiện popup thêm hàng */
  const [barcodeMiss, setBarcodeMiss] = useState(null)
  const [busy, setBusy] = useState(false)
  /** Khóa chống trùng hóa đơn khi bấm Thanh toán lại sau lỗi mạng */
  const [checkoutIds] = useState(createRequestIdHolder)
  const [error, setError] = useState('')
  const [editPriceLineId, setEditPriceLineId] = useState(null)
  /** Đơn giá hợp lệ lúc mở popover — nhập sai thì trả về giá này */
  const [priceEditBaseline, setPriceEditBaseline] = useState(null)
  const skipPriceBlurRef = useRef(false)
  const [priceAnchor, setPriceAnchor] = useState(null)
  /** Ô SL đang gõ tay — cho phép xóa hết rồi nhập số mới (commit khi blur/Enter) */
  const [qtyDraft, setQtyDraft] = useState(null)
  const [postSale, setPostSale] = useState(() => saved?.postSale || null)
  const [nowLabel, setNowLabel] = useState('')
  const [noteInputFocused, setNoteInputFocused] = useState(false)
  const [confirmDebt, setConfirmDebt] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  /** { key, title } — xác nhận đóng tab còn hàng */
  const [confirmCloseTab, setConfirmCloseTab] = useState(null)
  const [restoreBanner, setRestoreBanner] = useState(() => {
    const n = (saved?.invoices || []).filter((inv) => (inv.items || []).length > 0).length
    if (n <= 0) return 0
    // Chỉ báo một lần mỗi phiên trình duyệt / app
    try {
      const flag = 'taphoa-pos-restore-hint'
      if (sessionStorage.getItem(flag) === '1') return 0
      sessionStorage.setItem(flag, '1')
    } catch {
      /* ignore */
    }
    return n
  })
  const activeKeyRef = useRef(activeKey)
  activeKeyRef.current = activeKey
  const invoicesRef = useRef(invoices)
  invoicesRef.current = invoices

  const unpaidDrafts = useMemo(
    () => invoices.filter((inv) => (inv.items || []).length > 0),
    [invoices],
  )

  // Banner chỉ còn khi thực sự còn giỏ dở
  useEffect(() => {
    if (restoreBanner > 0 && unpaidDrafts.length === 0) {
      setRestoreBanner(0)
    }
  }, [restoreBanner, unpaidDrafts.length])

  function openFirstUnpaidDraft() {
    const first = unpaidDrafts[0]
    if (!first) {
      setRestoreBanner(0)
      return
    }
    setActiveTabKey(first.key)
    requestAnimationFrame(() => searchRef.current?.focus())
  }
  const suppressSuggestRef = useRef(false)
  const suggestRef = useRef([])
  suggestRef.current = suggest
  const addProductRef = useRef(null)
  /** Chống quét 1 lần bị +2 (Enter + request trùng trong ~450ms) */
  const lastAddRef = useRef({ productId: null, variantId: null, code: '', at: 0 })
  /** Bỏ qua kết quả tra mã cũ khi đã quét mã mới hơn (tránh spam hàng cũ lên đầu). */
  const searchGenRef = useRef(0)
  /** Mã đang tra — tránh Enter kép cùng một mã (vẫn cho quét mã khác). */
  const searchInflightRef = useRef(new Set())
  /**
   * Mã vừa thêm thành công còn đang hiện trong ô tìm (select sẵn để quét tiếp).
   * Chặn debounce auto-submit lặp lại cùng mã cho đến khi user/máy quét gõ mã mới.
   */
  const lastCommittedBarcodeRef = useRef('')
  /** Phím máy quét (cách nhau rất ngắn) — thêm hàng, không xổ gợi ý. */
  const scanBurstRef = useRef(false)
  /** Số lần liên tiếp gap &lt; ngưỡng khi gõ toàn số (tránh gõ tay nhanh bị coi là máy quét). */
  const fastDigitStreakRef = useRef(0)
  const lastSearchKeyAtRef = useRef(0)
  /** Tránh mở 2 tab sửa cùng một hóa đơn (Strict Mode / navigate chậm). */
  const reopenHandledRef = useRef(null)

  const active = invoices.find((i) => i.key === activeKey) || invoices[0]
  const showNoteHint = !(active?.note || '').length && !noteInputFocused

  useEffect(() => {
    const tick = () => {
      const d = new Date(
        new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }),
      )
      const pad = (n) => String(n).padStart(2, '0')
      setNowLabel(
        `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`,
      )
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [])

  // Giữ hóa đơn đang bán khi chuyển trang / tải lại; chỉ xóa khi hoàn tất (in hoặc hủy)
  useEffect(() => {
    try {
      localStorage.setItem(POS_STORAGE_KEY, JSON.stringify({ invoices, activeKey, postSale }))
    } catch {
      /* bỏ qua nếu hết dung lượng */
    }
    pruneStaleDebtDrafts(invoices.map((i) => i.key))
  }, [invoices, activeKey, postSale])

  useEffect(() => {
    searchRef.current?.focus()
  }, [activeKey])

  function productCodes(p) {
    return [
      p.barcode,
      p.sku && p.sku !== p.barcode ? p.sku : null,
      ...(Array.isArray(p.barcodes) ? p.barcodes : []),
    ]
      .filter(Boolean)
      .map(String)
  }

  function suggestCodeLine(p) {
    const uniq = [...new Set(productCodes(p))]
    return uniq[0] || ''
  }

  function looksLikeBarcode(raw) {
    const s = String(raw || '').trim()
    if (!s) return false
    // Máy quét gửi EAN/UPC/GTIN hoặc mã nội bộ dạng số / SP…
    return /^[0-9]{8,14}$/.test(s) || (/^[A-Za-z0-9._-]{4,64}$/.test(s) && !/\s/.test(s))
  }

  useEffect(() => {
    if (suppressSuggestRef.current) {
      suppressSuggestRef.current = false
      setSuggest([])
      // Giữ popup "thêm hàng" khi vừa quét mã không có
      if (!(barcodeMiss && q.trim() === barcodeMiss)) {
        setShowSuggest(false)
      }
      return
    }
    const term = q.trim()
    // Máy quét: không xổ gợi ý. Mã không có trong hệ thống vẫn hiện panel thêm hàng.
    if (scanBurstRef.current && !(barcodeMiss && term === barcodeMiss)) {
      setSuggest([])
      setShowSuggest(false)
      return
    }
    if (!term) {
      setSuggest([])
      setShowSuggest(false)
      setBarcodeMiss(null)
      return
    }
    if (barcodeMiss && term !== barcodeMiss) {
      setBarcodeMiss(null)
    }
    // Mã vừa thêm vẫn nằm trong ô (bôi đen) — không xổ gợi ý thừa
    if (lastCommittedBarcodeRef.current === term) {
      setSuggest([])
      setShowSuggest(false)
      return
    }
    // Đã xác nhận mã không có trong hệ thống
    if (barcodeMiss && term === barcodeMiss) {
      setSuggest([])
      setShowSuggest(true)
      return
    }
    let cancelled = false
    const parts = parsePosSearchQuery(term)
    const delay =
      parts.kind === 'barcode' && /^[0-9]{8,14}$/.test(parts.barcode) ? 80 : 160
    const t = setTimeout(() => {
      if (scanBurstRef.current && !(barcodeMiss && term === barcodeMiss)) return
      const load = async () => {
        try {
          // Mã vạch đủ số (không kèm tên): ưu tiên khớp exact
          if (parts.kind === 'barcode' && /^[0-9]{8,14}$/.test(parts.barcode)) {
            try {
              const p = await api(
                `/api/products/by-barcode/${encodeURIComponent(parts.barcode)}`,
              )
              if (cancelled) return
              setSuggest(p ? [p] : [])
              setShowSuggest(Boolean(p))
              return
            } catch {
              /* fallback search bên dưới */
            }
            if (/^[0-9]{12}$/.test(parts.barcode)) {
              try {
                const p = await api(
                  `/api/products/by-barcode/${encodeURIComponent(`0${parts.barcode}`)}`,
                )
                if (cancelled) return
                setSuggest(p ? [p] : [])
                setShowSuggest(Boolean(p))
                return
              } catch {
                /* continue */
              }
            }
          }

          let list = []
          if (parts.kind === 'compound' && (parts.barcode || parts.name)) {
            // Mã-(tên): lấy theo mã và/hoặc tên rồi giao điều kiện (AND)
            const queries = []
            if (parts.barcode) queries.push(parts.barcode)
            if (parts.name) queries.push(parts.name)
            const pages = await Promise.all(
              queries.map((qq) =>
                api(
                  `/api/products?q=${encodeURIComponent(qq)}&activeOnly=true&page=0&size=40`,
                ).catch(() => ({ content: [] })),
              ),
            )
            if (cancelled) return
            const byId = new Map()
            for (const page of pages) {
              for (const p of page.content || []) {
                if (productMatchesPosQuery(p, parts)) byId.set(p.id, p)
              }
            }
            list = [...byId.values()]
          } else {
            const data = await api(
              `/api/products?q=${encodeURIComponent(term)}&activeOnly=true&page=0&size=30`,
            )
            if (cancelled) return
            list = data.content || []
            if (parts.kind === 'barcode' && /^[0-9]{8,14}$/.test(parts.barcode)) {
              const exact = list.filter(
                (p) =>
                  String(p.barcode || '') === parts.barcode ||
                  String(p.sku || '') === parts.barcode ||
                  (Array.isArray(p.barcodes) &&
                    p.barcodes.some((b) => String(b) === parts.barcode)),
              )
              list = exact.length ? exact : list.slice(0, 8)
            }
          }
          setSuggest(list)
          setShowSuggest(true)
        } catch {
          if (!cancelled) setSuggest([])
        }
      }
      void load()
    }, delay)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q, barcodeMiss])

  const merchandise = useMemo(
    () => (active?.items || []).reduce((s, it) => s + lineTotal(it), 0),
    [active],
  )
  const discount = Number(active?.discount) || 0
  const payableBeforeRounding = Math.max(0, merchandise - discount)
  /** Tiền mặt / nợ: làm tròn lên 1.000 đ; chuyển khoản giữ nguyên */
  const rounding = roundingFor(active?.paymentMethod || 'CASH', payableBeforeRounding)
  const due = payableBeforeRounding + rounding
  const paidNum = active?.paidInput === '' || active?.paidInput == null
    ? due
    : Number(parseMoneyInput(active.paidInput)) || 0
  const change = Math.max(0, paidNum - due)
  const itemCount = (active?.items || []).reduce((s, it) => s + (Number(it.qty) || 0), 0)

  const applyInvoiceList = useCallback((list) => {
    bumpSeqFromInvoices(list)
    return normalizeInvoices(list)
  }, [])

  const setActiveTabKey = useCallback((key) => {
    activeKeyRef.current = key
    setActiveKey(key)
  }, [])

  /** Quay lại từ form ghi nợ / tạo hàng từ POS — chọn đúng tab hóa đơn */
  useEffect(() => {
    let resumeKey = location.state?.resumeInvoiceKey
    if (!resumeKey) {
      resumeKey = readPosPendingDebt()?.invoiceKey
    }
    if (!resumeKey) return
    if (invoicesRef.current.some((i) => i.key === resumeKey)) {
      setActiveTabKey(resumeKey)
    }
  }, [location.key, location.state?.resumeInvoiceKey, setActiveTabKey])

  /** Từ lịch sử: mở lại phiếu mua để sửa (hủy cũ + tạo mới lúc thanh toán) */
  useEffect(() => {
    const sale = location.state?.reopenSale
    if (!sale?.id || sale.cancelledAt) return
    const handleKey = `${location.key}:${sale.id}`
    if (reopenHandledRef.current === handleKey) {
      navigate(location.pathname, { replace: true, state: {} })
      return
    }
    reopenHandledRef.current = handleKey
    navigate(location.pathname, { replace: true, state: {} })

    const existing = invoicesRef.current.find((i) => String(i.amendSaleId) === String(sale.id))
    if (existing) {
      setActiveTabKey(existing.key)
      requestAnimationFrame(() => searchRef.current?.focus())
      return
    }

    const items = cartItemsFromSale(sale)
    if (items.length === 0) {
      toast.error('Hóa đơn không còn hàng hợp lệ để sửa')
      return
    }
    const method = String(sale.paymentMethod || 'CASH').toUpperCase()
    const payMethod =
      method === 'DEBT' || method === 'MIXED' || method === 'TRANSFER' || method === 'CARD' || method === 'WALLET'
        ? method === 'MIXED'
          ? 'CASH'
          : method
        : 'CASH'
    const fresh = {
      ...newInvoice(invoicesRef.current.length + 1),
      title: `Sửa ${sale.code || ''}`.trim(),
      items,
      note: sale.note || '',
      customerName: sale.customerName || '',
      customerId: sale.customerId || null,
      discount: Number(sale.discountAmount) || 0,
      paymentMethod: payMethod === 'DEBT' ? 'DEBT' : payMethod,
      paidInput:
        payMethod === 'DEBT'
          ? '0'
          : String(Math.round(Number(sale.paidAmount) || Number(sale.totalAmount) || 0)),
      amendSaleId: sale.id,
      amendSaleCode: sale.code || '',
    }
    setInvoices((list) => {
      if (list.some((i) => String(i.amendSaleId) === String(sale.id))) return list
      return applyInvoiceList([...list, fresh])
    })
    setActiveTabKey(fresh.key)
    setPostSale(null)
    setError('')
    toast.success(`Đã mở lại ${sale.code} — sửa xong bấm Cập nhật hóa đơn`)
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [location.key, location.state?.reopenSale, navigate, location.pathname, setActiveTabKey, applyInvoiceList, toast])

  /** Sau khi tạo hàng từ POS: quay lại hóa đơn và tự thêm dòng */
  useEffect(() => {
    const productId = location.state?.addProductId
    if (!productId) return
    const resumeKey = location.state?.resumeInvoiceKey
    const scanned = location.state?.addProductBarcode || ''
    navigate(location.pathname, {
      replace: true,
      state: resumeKey ? { resumeInvoiceKey: resumeKey } : {},
    })
    if (resumeKey && invoicesRef.current.some((i) => i.key === resumeKey)) {
      setActiveTabKey(resumeKey)
    }
    let cancelled = false
    api(`/api/products/${productId}`)
      .then((p) => {
        if (cancelled) return
        addProductRef.current?.(p, scanned || p.barcode)
        toast.success(`Đã thêm ${p.name} vào hóa đơn`)
      })
      .catch((e) => {
        if (!cancelled) toast.error(e.message || 'Không tải được hàng vừa tạo')
      })
    return () => {
      cancelled = true
    }
  }, [location.key, location.state?.addProductId, location.pathname, navigate, setActiveTabKey, toast])

  const patchActive = useCallback(
    (fn) => {
      const key = activeKeyRef.current
      setInvoices((list) => {
        let next = list
        if (list.filter((inv) => inv.key === key).length !== 1) {
          next = normalizeInvoices(list)
        }
        return next.map((inv) => {
          if (inv.key !== key) return inv
          const patched = fn(inv)
          return {
            ...patched,
            items: Array.isArray(patched.items)
              ? patched.items.map((it) => ({ ...it }))
              : [],
          }
        })
      })
    },
    [],
  )

  function renumber(list) {
    return list.map((inv, idx) => ({ ...inv, title: `Hóa đơn ${idx + 1}` }))
  }

  function resetBarcodeSearch() {
    suppressSuggestRef.current = true
    scanBurstRef.current = false
    fastDigitStreakRef.current = 0
    lastSearchKeyAtRef.current = 0
    setBarcodeMiss(null)
    setQ('')
    setSuggest([])
    setShowSuggest(false)
    setError('')
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  function selectTab(key) {
    if (key === activeKeyRef.current) {
      searchRef.current?.focus()
      return
    }
    setActiveTabKey(key)
    resetBarcodeSearch()
  }

  function addTab() {
    const list = invoicesRef.current
    bumpSeqFromInvoices(list)
    const fresh = newInvoice(list.length + 1)
    const nextList = applyInvoiceList(renumber([...list, fresh]))
    const created = nextList.find((i) => i.key === fresh.key) || nextList[nextList.length - 1]
    if (created?.key) setActiveTabKey(created.key)
    setInvoices(nextList)
    resetBarcodeSearch()
  }

  function invoiceTabHasProducts(inv) {
    return (inv?.items?.length ?? 0) > 0
  }

  function requestCloseTab(key) {
    const inv = invoicesRef.current.find((i) => i.key === key)
    if (inv && invoiceTabHasProducts(inv)) {
      setConfirmCloseTab({ key, title: inv.title || 'Hóa đơn' })
      return
    }
    closeTab(key)
  }

  function closeTab(key) {
    clearDebtFormDraft(key)
    const pending = readPosPendingDebt()
    if (pending?.invoiceKey === key) clearPosPendingDebt()
    const list = invoicesRef.current
    const wasActive = activeKeyRef.current === key
    const closedIndex = list.findIndex((i) => i.key === key)
    let nextList
    if (list.length <= 1) {
      bumpSeqFromInvoices(list)
      nextList = applyInvoiceList([newInvoice(1)])
    } else {
      nextList = applyInvoiceList(renumber(list.filter((i) => i.key !== key)))
    }
    // Key phải set trước setInvoices — updater React chạy lúc render, gán trong đó thì tab còn lại không được chọn.
    let nextActiveKey = activeKeyRef.current
    if (wasActive) {
      if (closedIndex > 0) {
        nextActiveKey = list[closedIndex - 1].key
      } else if (closedIndex >= 0 && list.length > 1) {
        nextActiveKey = list[1].key
      } else {
        nextActiveKey = nextList[0]?.key
      }
      if (!nextList.some((i) => i.key === nextActiveKey)) {
        nextActiveKey = nextList[0]?.key
      }
    } else if (!nextList.some((i) => i.key === nextActiveKey)) {
      nextActiveKey = nextList[0]?.key
    }
    if (nextActiveKey) setActiveTabKey(nextActiveKey)
    setInvoices(nextList)
    setPostSale(null)
    if (wasActive || !nextList.some((i) => i.key === activeKeyRef.current)) {
      resetBarcodeSearch()
    }
  }

  function pickBaseUnit(p) {
    const units = p.units || []
    return units.find((u) => u.base) || units[0] || null
  }

  function addProduct(p, scannedCode, addQty = 1, variant = null) {
    if (p?.id == null) return
    const shown =
      (scannedCode && String(scannedCode).trim()) ||
      p.barcode ||
      p.sku ||
      ''
    const variantId = variant?.id ?? null
    const now = Date.now()
    const last = lastAddRef.current
    // Cùng mã/sản phẩm/kiểu trong 800ms = 1 lần quét bị xử lý trùng → bỏ
    if (
      String(last.productId) === String(p.id) &&
      String(last.variantId ?? '') === String(variantId ?? '') &&
      (!shown || last.code === shown) &&
      now - last.at < 800
    ) {
      suppressSuggestRef.current = true
      setQ(shown)
      setSuggest([])
      setShowSuggest(false)
      requestAnimationFrame(() => {
        searchRef.current?.focus()
        searchRef.current?.select()
      })
      return
    }
    lastAddRef.current = { productId: p.id, variantId, code: shown, at: now }

    bumpSeqFromInvoices(invoicesRef.current)
    const unit = pickBaseUnit(p)
    const unitId = unit?.id ?? null
    const unitName = unit?.name || p.unit || 'Cái'
    const variantName = variant?.name ? String(variant.name).trim() : ''
    const displayName = variantName ? `${p.name} — ${variantName}` : p.name
    const variantSell =
      variant && variant.sellPrice != null && variant.sellPrice !== ''
        ? Number(variant.sellPrice)
        : null
    patchActive((inv) => {
      const existing = inv.items.find((it) =>
        sameCartLine(it, p.id, unitId, unitName, variantId),
      )
      let items
      if (existing) {
        // Cộng SL tại chỗ — không kéo dòng lên đầu (tránh nhảy STT / đè hàng vừa quét)
        items = inv.items.map((it) =>
          it.lineId === existing.lineId
            ? {
                ...it,
                qty: (Number(it.qty) || 0) + addQty,
                unitId: normUnitId(it.unitId) != null ? it.unitId : unitId,
                units: (it.units || []).length ? it.units : unitsOf(p),
              }
            : it,
        )
      } else {
        items = [
          {
            lineId: nextLineId(),
            productId: p.id,
            barcode: p.barcode,
            name: displayName,
            variantId,
            variantName: variantName || null,
            qty: addQty,
            unitId,
            unitName,
            unitFactor: unit?.factor || 1,
            unitPrice: (() => {
              const raw =
                variantSell != null && Number.isFinite(variantSell)
                  ? variantSell
                  : Number(unit?.sellPrice ?? p.sellPrice) || 0
              return isSellPriceValid(raw) ? raw : snapSellPrice(raw)
            })(),
            units: unitsOf(p),
            stockQty: p.stockQty,
          },
          ...inv.items,
        ]
      }
      return { ...inv, items: coalesceCartItemsStatic(items) }
    })
    // Giống KiotViet: ô tìm giữ mã vừa quét (bôi đen để lần quét sau ghi đè)
    suppressSuggestRef.current = true
    setBarcodeMiss(null)
    setQ(shown)
    setSuggest([])
    setShowSuggest(false)
    setError('')
    requestAnimationFrame(() => {
      const el = searchRef.current
      if (!el) return
      el.focus()
      el.select()
    })
  }

  addProductRef.current = addProduct

  function unitsOf(p) {
    const units = p.units || []
    if (units.length) return units
    return [
      {
        id: null,
        name: p.unit || 'Cái',
        factor: 1,
        sellPrice: p.sellPrice,
        costPrice: p.costPrice,
        base: true,
      },
    ]
  }

  function changeLineUnit(lineId, unitIdRaw) {
    patchActive((inv) => ({
      ...inv,
      items: inv.items.map((it) => {
        if (it.lineId !== lineId) return it
        const unit =
          (it.units || []).find((u) => String(u.id) === String(unitIdRaw)) ||
          (it.units || [])[0]
        if (!unit) return it
        return {
          ...it,
          unitId: unit.id ?? null,
          unitName: unit.name,
          unitFactor: unit.factor || 1,
          unitPrice: Number(unit.sellPrice) || 0,
        }
      }),
    }))
  }

  function isProductNotFoundError(err) {
    const msg = String(err?.message || '')
    return /không tìm thấy/i.test(msg)
  }

  /** Tra mã chính + biến thể UPC/EAN (thiếu/thừa số 0 đầu). */
  async function fetchProductByBarcode(code) {
    const variants = [code]
    if (/^[0-9]{12}$/.test(code)) variants.push(`0${code}`)
    if (/^[0-9]{13}$/.test(code) && code.startsWith('0')) variants.push(code.slice(1))
    let lastErr = null
    for (const variant of variants) {
      try {
        return await api(`/api/products/by-barcode/${encodeURIComponent(variant)}`)
      } catch (err) {
        lastErr = err
        if (!isProductNotFoundError(err)) throw err
      }
    }
    throw lastErr || new Error(`Không tìm thấy hàng hóa với mã: ${code}`)
  }

  async function submitSearchCode(rawCode) {
    const code = String(rawCode || '').trim()
    if (!code) return
    if (searchInflightRef.current.has(code)) return
    searchInflightRef.current.add(code)
    const gen = ++searchGenRef.current
    setError('')
    setQ(code)
    // Xóa gợi ý cũ ngay — tránh Enter lấy sug[0] hàng trước (spam)
    suppressSuggestRef.current = true
    setSuggest([])
    setShowSuggest(false)
    const stillCurrent = () => gen === searchGenRef.current
    const parts = parsePosSearchQuery(code)
    try {
      // Mã-(tên): Enter thêm hàng khớp cả hai (ưu tiên gợi ý đang hiện)
      if (parts.kind === 'compound') {
        const sugHit = (suggestRef.current || []).find((p) =>
          productMatchesPosQuery(p, parts),
        )
        if (sugHit) {
          lastCommittedBarcodeRef.current = ''
          addProductRef.current?.(sugHit, suggestCodeLine(sugHit))
          return
        }
        const queries = []
        if (parts.barcode) queries.push(parts.barcode)
        if (parts.name) queries.push(parts.name)
        const pages = await Promise.all(
          queries.map((qq) =>
            api(
              `/api/products?q=${encodeURIComponent(qq)}&activeOnly=true&page=0&size=40`,
            ).catch(() => ({ content: [] })),
          ),
        )
        if (!stillCurrent()) return
        const byId = new Map()
        for (const page of pages) {
          for (const p of page.content || []) {
            if (productMatchesPosQuery(p, parts)) byId.set(p.id, p)
          }
        }
        const hit = [...byId.values()][0]
        if (hit) {
          lastCommittedBarcodeRef.current = ''
          addProductRef.current?.(hit, suggestCodeLine(hit))
        } else {
          setQ(code)
          setError('Không tìm thấy hàng hóa')
          setShowSuggest(true)
        }
        return
      }

      // Quét mã: luôn tra đúng barcode trước
      try {
        const p = await fetchProductByBarcode(code)
        if (!stillCurrent()) return
        lastCommittedBarcodeRef.current = code
        addProductRef.current?.(p, code)
        return
      } catch (err) {
        if (!stillCurrent()) return
        if (!isProductNotFoundError(err)) {
          setError(err.message || 'Lỗi tìm mã vạch')
          requestAnimationFrame(() => {
            searchRef.current?.focus()
            searchRef.current?.select()
          })
          return
        }
      }
      if (!stillCurrent()) return

      // Mã số: chỉ thêm khi khớp đúng barcode/sku — không fallback gợi ý tên cũ
      if (looksLikeBarcode(code) || /^[0-9]{8,14}$/.test(code)) {
        const data = await api(
          `/api/products?q=${encodeURIComponent(code)}&activeOnly=true&page=0&size=8`,
        ).catch(() => ({ content: [] }))
        if (!stillCurrent()) return
        const exact =
          (data.content || []).find(
            (p) =>
              String(p.barcode || '') === code ||
              String(p.sku || '') === code ||
              (Array.isArray(p.barcodes) && p.barcodes.some((b) => String(b) === code)),
          ) || null
        if (exact) {
          lastCommittedBarcodeRef.current = code
          addProductRef.current?.(exact, code)
          return
        }
        lastCommittedBarcodeRef.current = ''
        setError('')
        setBarcodeMiss(code)
        setQ(code)
        setSuggest([])
        setShowSuggest(true)
        requestAnimationFrame(() => {
          searchRef.current?.focus()
          searchRef.current?.select()
        })
        return
      }

      // Tìm theo tên: chỉ lấy gợi ý khớp tên với từ khóa vừa Enter
      const qLower = code.toLowerCase()
      const sugHit = (suggestRef.current || []).find((p) =>
        String(p.name || '')
          .toLowerCase()
          .includes(qLower),
      )
      if (sugHit) {
        lastCommittedBarcodeRef.current = ''
        addProductRef.current?.(sugHit, suggestCodeLine(sugHit))
        return
      }
      const data = await api(
        `/api/products?q=${encodeURIComponent(code)}&activeOnly=true&page=0&size=8`,
      ).catch(() => ({ content: [] }))
      if (!stillCurrent()) return
      if (data.content?.[0]) {
        lastCommittedBarcodeRef.current = ''
        addProductRef.current?.(data.content[0], data.content[0].barcode)
      } else {
        setQ(code)
        setError('Không tìm thấy hàng hóa')
        setShowSuggest(true)
      }
    } finally {
      searchInflightRef.current.delete(code)
    }
  }

  const submitSearchRef = useRef(submitSearchCode)
  submitSearchRef.current = submitSearchCode

  /**
   * Chỉ máy quét (chuỗi số vào rất nhanh) mới tự thêm khi đủ mã EAN/UPC (12–14).
   * Không auto ở 8 số khi ô tìm đang gõ — dễ trùng gõ tay → select cả ô → số tiếp theo xóa hết.
   * Gõ tay / mã-(tên): giữ gợi ý, Enter hoặc bấm dòng mới thêm.
   */
  useEffect(() => {
    const term = q.trim()
    if (!scanBurstRef.current) return undefined
    if (!/^[0-9]{12,14}$/.test(term)) return undefined
    if (barcodeMiss && term === barcodeMiss) return undefined
    if (lastCommittedBarcodeRef.current === term) return undefined
    const t = window.setTimeout(() => {
      if (!scanBurstRef.current) return
      if (lastCommittedBarcodeRef.current === term) return
      void submitSearchRef.current(term)
    }, 180)
    return () => window.clearTimeout(t)
  }, [q, barcodeMiss])

  const { clearBuffer: clearWedgeBuffer } = usePosBarcodeWedge({
    searchRef,
    onEnter: (code) => submitSearchRef.current(code),
    onInput: (partial) => {
      scanBurstRef.current = true
      suppressSuggestRef.current = true
      lastCommittedBarcodeRef.current = ''
      setError('')
      setBarcodeMiss(null)
      setQ(partial)
      setSuggest([])
      setShowSuggest(false)
    },
  })

  async function onSearchKey(e) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    // Đọc giá trị DOM — tránh React state chưa kịp cập nhật ký tự cuối của máy quét
    const typed = e.currentTarget?.value ?? searchRef.current?.value ?? q
    lastCommittedBarcodeRef.current = ''
    await submitSearchCode(typed)
  }

  function updateLine(lineId, patch) {
    patchActive((inv) => ({
      ...inv,
      items: inv.items.map((it) => (it.lineId === lineId ? { ...it, ...patch } : it)),
    }))
  }

  function commitQtyInput(lineId, rawText, fallbackQty) {
    const trimmed = String(rawText ?? '').trim()
    const n = trimmed === '' ? fallbackQty : parseInt(trimmed, 10)
    const qty = Number.isFinite(n) && n >= 1 ? n : Math.max(1, Number(fallbackQty) || 1)
    updateLine(lineId, { qty })
    setQtyDraft((d) => (d?.lineId === lineId ? null : d))
  }

  function removeLine(lineId) {
    patchActive((inv) => ({
      ...inv,
      items: inv.items.filter((it) => it.lineId !== lineId),
    }))
    setEditPriceLineId((cur) => (cur === lineId ? null : cur))
    setQtyDraft((d) => (d?.lineId === lineId ? null : d))
    setPriceAnchor(null)
    // Xóa xong clear ô tìm — tránh mã còn trên ô bị Enter thêm lại dòng vừa xóa
    suppressSuggestRef.current = true
    setQ('')
    setSuggest([])
    setShowSuggest(false)
    requestAnimationFrame(() => searchRef.current?.focus())
  }

  function selectPaymentMethod(code) {
    if (code === 'DEBT') {
      if (!active?.items?.length) {
        setError('Chưa có hàng trong hóa đơn')
        return
      }
      setConfirmDebt(true)
      return
    }
    patchActive((inv) => ({
      ...inv,
      paymentMethod: code,
      paidInput: inv.paidInput === '0' ? '' : inv.paidInput,
    }))
  }

  function confirmDebtMode() {
    patchActive((inv) => ({
      ...inv,
      paymentMethod: 'DEBT',
      paidInput: '0',
    }))
    setConfirmDebt(false)
    setError('')
  }

  function goDebtForm() {
    if (!active || active.items.length === 0) {
      setError('Chưa có hàng trong hóa đơn')
      return
    }
    if (!assertCartSellPrices()) return
    const debtError = debtAmountError(due)
    if (debtError) {
      setError(debtError)
      return
    }
    setError('')
    const debtNavState = {
      fromPos: true,
      invoiceKey: active.key,
      invoiceTitle: active.title,
      resumeDebtForm: posDebtFormDraftExists(active.key),
      amount: due,
      discount: discount,
      productNote: buildDebtProductNote(active.items),
      items: active.items.map((it) => ({
        productId: it.productId,
        qty: Number(it.qty) || 1,
        productUnitId: it.unitId != null && Number(it.unitId) > 0 ? Number(it.unitId) : null,
        name: it.name,
        unitName: it.unitName,
        unitFactor: it.unitFactor,
        unitPrice: sellPrice(it),
      })),
      note: active.note || null,
    }
    savePosPendingDebt(debtNavState)
    navigate('/debts/new', { state: debtNavState })
  }

  function assertCartSellPrices() {
    if (!active?.items?.length) return true
    for (const it of active.items) {
      const price = sellPrice(it)
      if (!isSellPriceValid(price)) {
        setError(`«${it.name}»: ${sellPriceError(price)}`)
        return false
      }
    }
    return true
  }

  async function checkout() {
    if (!active || active.items.length === 0) {
      setError('Chưa có hàng trong hóa đơn')
      return
    }
    if (!assertCartSellPrices()) return
    // Sửa hóa đơn: thanh toán nợ cũng qua replace (không sang form ghi nợ riêng)
    if ((active.paymentMethod || 'CASH') === 'DEBT' && !active.amendSaleId) {
      goDebtForm()
      return
    }
    setError('')
    setBusy(true)
    try {
      const method = active.paymentMethod || 'CASH'
      let paidAmount = paidNum
      let paymentMethod = method
      const debtAmount = Math.max(0, due - paidAmount)

      if (method === 'DEBT') {
        paidAmount = 0
        paymentMethod = 'DEBT'
        if (!active.customerName?.trim()) {
          setError('Bán nợ cần nhập tên khách hàng')
          setBusy(false)
          return
        }
        const fullDebtError = debtAmountError(due)
        if (fullDebtError) {
          setError(fullDebtError)
          setBusy(false)
          return
        }
      } else if (debtAmount > 0) {
        if (!active.customerName?.trim()) {
          setError('Còn thiếu tiền — cần chọn khách để ghi nợ')
          setBusy(false)
          return
        }
        const partialDebtError = debtAmountError(debtAmount)
        if (partialDebtError) {
          setError(partialDebtError)
          setBusy(false)
          return
        }
        // Chuyển khoản còn thiếu: giữ TRANSFER để BE không làm tròn (BE tự đổi thành MIXED).
        // Tiền mặt còn thiếu: MIXED / DEBT — BE làm tròn giống phần hiển thị.
        paymentMethod = method === 'TRANSFER' ? 'TRANSFER' : paidAmount > 0 ? 'MIXED' : 'DEBT'
      }

      const saleItems = await Promise.all(
        active.items.map(async (it) => {
          const productId = it.productId
          const qty = Number(it.qty) || 1
          const unitPrice = sellPrice(it)
          // unitId trên giỏ có thể cũ sau khi sửa hàng: khớp lại theo id/tên, không khớp thì báo lỗi
          // (không tự hạ về đơn vị cơ bản — sẽ sai giá và sai tồn).
          const p = await api(`/api/products/${productId}`, { inlineErrors: true })
          return {
            productId,
            qty,
            productUnitId: resolveSaleUnitId(p, it),
            variantId: it.variantId != null && Number(it.variantId) > 0 ? Number(it.variantId) : null,
            unitPrice,
          }
        }),
      )
      const salePayload = {
        items: saleItems,
        paymentMethod,
        paidAmount: debtAmount > 0 && paymentMethod === 'DEBT' ? 0 : paidAmount,
        discountAmount: discount,
        customerName: active.customerName?.trim() || null,
        pickerName: active.customerName?.trim() || null,
        debtType: 'PERSONAL',
        note: active.note || null,
        productNote: debtAmount > 0 ? buildDebtProductNote(active.items) : null,
      }
      const body = { ...salePayload, clientRequestId: checkoutIds.idFor(salePayload) }
      const sale = active.amendSaleId
        ? await api(`/api/sales/${active.amendSaleId}/replace`, {
            method: 'POST',
            inlineErrors: true,
            body: JSON.stringify(body),
          })
        : await api('/api/sales', {
            method: 'POST',
            inlineErrors: true,
            body: JSON.stringify(body),
          })
      checkoutIds.reset()
      setPostSale({
        sale,
        invoiceKey: active.key,
        customerName: active.customerName?.trim() || '',
        amendedFrom: active.amendSaleCode || null,
      })
      resetBarcodeSearch()
    } catch (e) {
      setError(
        e.network || e.serverError
          ? `${e.message}. Giỏ hàng vẫn còn — bấm Thanh toán lại, hệ thống không tạo trùng hóa đơn.`
          : e.message || 'Thanh toán thất bại',
      )
    } finally {
      setBusy(false)
    }
  }

  function postSaleSuccessMessage(snapshot = postSale) {
    return snapshot?.amendedFrom ? 'Cập nhật hóa đơn thành công' : 'Thanh toán thành công'
  }

  function completePostSale(invoiceKey) {
    toast.success(postSaleSuccessMessage())
    closeTab(invoiceKey)
  }

  function finishPostSale(doPrint) {
    const snapshot = postSale
    if (!snapshot) return
    if (doPrint) {
      setPostSale({ ...snapshot, showPrint: true })
      return
    }
    completePostSale(snapshot.invoiceKey)
  }

  async function confirmSalePrint() {
    const snapshot = postSale
    if (!snapshot) return
    document.body.classList.add('print-sale')
    // Đợi CSS thu gọn (giống in công nợ) trước khi đo khổ / gửi máy in
    await new Promise((r) => setTimeout(r, 80))
    try {
      await printReceipt()
      toast.success(postSaleSuccessMessage(snapshot))
    } catch (e) {
      toast.error(e.message || 'In thất bại')
      return
    } finally {
      document.body.classList.remove('print-sale')
    }
    closeTab(snapshot.invoiceKey)
  }

  const editing = active?.items.find((it) => it.lineId === editPriceLineId)

  return (
    <div className="pos-shell">
      <header className="pos-topbar">
        <div className="pos-search-wrap">
          <input
            ref={searchRef}
            className="pos-search"
            placeholder="Quét mã / mã / tên / 123-(tên hàng)"
            value={q}
            onChange={(e) => {
              const raw = e.target.value
              const shortcut = applyBarcodeNameShortcut(q, raw)
              const v = shortcut?.value ?? raw
              const now = Date.now()
              const gap = lastSearchKeyAtRef.current ? now - lastSearchKeyAtRef.current : 999
              lastSearchKeyAtRef.current = now
              const trimmed = v.trim()
              const digitsOnly = /^[0-9]+$/.test(trimmed)
              // Tên / mã-(tên) / gõ chậm: luôn gợi ý.
              // Máy quét khi ô tìm focus: nhiều phím số liên tiếp rất nhanh (≥3 gap ngắn).
              if (!digitsOnly) {
                scanBurstRef.current = false
                fastDigitStreakRef.current = 0
              } else if (gap < 35) {
                fastDigitStreakRef.current += 1
                if (trimmed.length >= 4 && fastDigitStreakRef.current >= 3) {
                  scanBurstRef.current = true
                }
              } else if (gap > 80) {
                scanBurstRef.current = false
                fastDigitStreakRef.current = 0
              } else {
                fastDigitStreakRef.current = 0
              }
              suppressSuggestRef.current = scanBurstRef.current
              lastCommittedBarcodeRef.current = ''
              setQ(v)
              setError('')
              setBarcodeMiss(null)
              if (shortcut?.caret != null) {
                requestAnimationFrame(() => {
                  const el = searchRef.current
                  if (!el) return
                  el.focus()
                  el.setSelectionRange(shortcut.caret, shortcut.caret)
                })
              }
              if (scanBurstRef.current) {
                setSuggest([])
                setShowSuggest(false)
              } else {
                setShowSuggest(Boolean(trimmed))
              }
            }}
            onFocus={() => {
              clearWedgeBuffer()
              if (scanBurstRef.current) return
              if (barcodeMiss && q.trim() === barcodeMiss) setShowSuggest(true)
              else if (q.trim() && lastCommittedBarcodeRef.current !== q.trim()) setShowSuggest(true)
            }}
            onBlur={() => setTimeout(() => setShowSuggest(false), 220)}
            onKeyDown={onSearchKey}
          />
          <button
            type="button"
            className="pos-search-scan"
            title="Quét mọi lúc trên màn POS (không cần click ô tìm) — hoặc click để focus ô tìm"
            onClick={() => {
              searchRef.current?.focus()
              searchRef.current?.select()
            }}
          >
            <ScanBarcode size={29} strokeWidth={2} aria-hidden />
          </button>
          {showSuggest && q.trim() && (
            <div className="pos-suggest-panel">
              <div className="pos-suggest" role="listbox" aria-label="Gợi ý hàng hóa">
                {suggest.length === 0 ? (
                  <p className="pos-suggest-empty">
                    {barcodeMiss && q.trim() === barcodeMiss
                      ? `Không tìm thấy mã vạch: ${barcodeMiss}`
                      : parsePosSearchQuery(q).kind === 'compound'
                        ? 'Không có hàng khớp mã và tên — thử bớt chữ hoặc chỉ mã/tên'
                        : 'Không có hàng khớp — thử tên, một phần mã, hoặc 123-(tên)'}
                  </p>
                ) : (
                  suggest.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className="pos-suggest-item"
                      role="option"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addProduct(p, suggestCodeLine(p))}
                    >
                      <span className="pos-suggest-meta">
                        <strong>{p.name}</strong>
                        <small className="pos-suggest-code">{suggestCodeLine(p)}</small>
                        <small className="pos-suggest-stock">
                          Tồn: {p.stockQty}
                          {p.category ? ` · ${p.category}` : ''}
                        </small>
                      </span>
                      <span className="pos-suggest-price">
                        {formatMoney(p.sellPrice).replace(' đ', '')}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <Link
                className="pos-suggest-add"
                to="/products/new"
                state={{
                  fromPos: true,
                  resumeInvoiceKey: active?.key,
                  barcode: (() => {
                    const parts = parsePosSearchQuery(q)
                    if (parts.barcode) return parts.barcode
                    if (parts.kind === 'text') return ''
                    return q.trim()
                  })(),
                }}
                onMouseDown={(e) => e.preventDefault()}
              >
                <Plus size={16} strokeWidth={2.25} aria-hidden />
                Thêm mới hàng hóa
              </Link>
            </div>
          )}
        </div>

        <div className="pos-tabs">
          {invoices.map((inv) => {
            const isActive = inv.key === activeKey
            const debtDraftOpen =
              posDebtFormDraftExists(inv.key) ||
              readPosPendingDebt()?.invoiceKey === inv.key
            return (
              <div
                key={inv.key}
                className={`pos-tab${isActive ? ' active' : ''}${debtDraftOpen ? ' has-debt-draft' : ''}${inv.amendSaleId ? ' is-amend' : ''}`}
              >
                <button
                  type="button"
                  className="pos-tab-label"
                  onClick={() => selectTab(inv.key)}
                  title={
                    isActive
                      ? 'Hóa đơn đang làm'
                      : inv.amendSaleId
                        ? `Đang sửa ${inv.amendSaleCode || ''}`
                        : debtDraftOpen
                          ? 'Đang ghi nợ dở — bấm GHI NỢ để tiếp tục'
                          : undefined
                  }
                >
                  <span className={isActive ? 'pos-tab-title' : undefined}>{inv.title}</span>
                  {debtDraftOpen && (
                    <span className="pos-tab-debt-badge" aria-label="Đang ghi nợ dở">
                      Nợ
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="pos-tab-close"
                  aria-label="Đóng hóa đơn"
                  onClick={(e) => {
                    e.stopPropagation()
                    requestCloseTab(inv.key)
                  }}
                >
                  <X size={18} strokeWidth={2.25} aria-hidden />
                </button>
              </div>
            )
          })}
          <button type="button" className="pos-tab-add" onClick={addTab} aria-label="Thêm hóa đơn">
            <Plus size={26} strokeWidth={2} aria-hidden />
          </button>
        </div>
      </header>

      <div className="pos-body">
        <section className="pos-cart">
          {restoreBanner > 0 && unpaidDrafts.length > 0 && (
            <div className="pos-restore-banner" role="status">
              <span>
                Đã khôi phục {unpaidDrafts.length} hóa đơn chưa thanh toán (lưu tạm trên máy)
                {unpaidDrafts.length === 1
                  ? ` — đang mở «${unpaidDrafts[0].title || 'Hóa đơn'}».`
                  : `. Bấm «Mở hóa đơn» để chuyển tới tab còn hàng.`}
              </span>
              <span className="pos-restore-banner-actions">
                {unpaidDrafts.length > 0 && (
                  <button type="button" className="btn pos-restore-open" onClick={openFirstUnpaidDraft}>
                    Mở hóa đơn
                  </button>
                )}
                <button type="button" className="link-btn" onClick={() => setRestoreBanner(0)}>
                  Đóng
                </button>
              </span>
            </div>
          )}
          {error && <p className="pos-error">{error}</p>}
          <div
            className="pos-cart-table-wrap"
            onMouseDown={() => {
              // Đóng gợi ý trước khi bấm X / ± — tránh panel đè nút
              if (showSuggest) setShowSuggest(false)
            }}
          >
            <table className="pos-cart-table">
              <colgroup>
                <col className="pos-col-del" />
                <col className="pos-col-stt" />
                <col className="pos-col-name" />
                <col className="pos-col-unit" />
                <col className="pos-col-qty" />
                <col className="pos-col-price" />
                <col className="pos-col-total" />
              </colgroup>
              {(active?.items?.length ?? 0) > 0 && (
                <thead>
                  <tr>
                    <th className="pos-col-del" aria-label="Xóa dòng" />
                    <th className="pos-col-stt">STT</th>
                    <th className="pos-col-name">Tên hàng</th>
                    <th className="pos-col-unit">đơn vị</th>
                    <th className="pos-col-qty">số lượng</th>
                    <th className="pos-col-price">Đơn giá</th>
                    <th className="pos-col-total">Thành tiền</th>
                  </tr>
                </thead>
              )}
              <tbody>
                {active?.items.map((it, idx) => (
                  <tr key={it.lineId}>
                    <td className="pos-col-del">
                      <button
                        type="button"
                        className="pos-line-del-btn"
                        title="Xóa dòng"
                        aria-label="Xóa dòng"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          removeLine(it.lineId)
                        }}
                      >
                        <Trash2 size={18} strokeWidth={2.25} aria-hidden />
                      </button>
                    </td>
                    <td className="pos-col-stt">{idx + 1}</td>
                    <td className="pos-col-name" title={it.name}>
                      {it.name}
                    </td>
                    <td className="pos-col-unit">
                      {(it.units || []).length > 1 ? (
                        <UnitPicker
                          units={it.units || []}
                          value={it.unitId}
                          onChange={(unitId) => changeLineUnit(it.lineId, unitId)}
                        />
                      ) : (
                        <span>{it.unitName || '—'}</span>
                      )}
                    </td>
                    <td className="pos-col-qty">
                      <div className="pos-qty-stepper">
                        <button
                          type="button"
                          className="pos-qty-btn"
                          aria-label="Giảm số lượng"
                          onClick={() => {
                            setQtyDraft((d) => (d?.lineId === it.lineId ? null : d))
                            updateLine(it.lineId, {
                              qty: Math.max(1, (Number(it.qty) || 1) - 1),
                            })
                          }}
                        >
                          −
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          aria-label="Số lượng"
                          value={
                            qtyDraft?.lineId === it.lineId
                              ? qtyDraft.text
                              : String(Number(it.qty) || 1)
                          }
                          onFocus={(e) => {
                            setQtyDraft({ lineId: it.lineId, text: String(Number(it.qty) || 1) })
                            e.target.select()
                          }}
                          onChange={(e) => {
                            const next = e.target.value.replace(/\D/g, '')
                            setQtyDraft({ lineId: it.lineId, text: next })
                          }}
                          onBlur={(e) => commitQtyInput(it.lineId, e.target.value, it.qty)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              e.currentTarget.blur()
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="pos-qty-btn"
                          aria-label="Tăng số lượng"
                          onClick={() => {
                            setQtyDraft((d) => (d?.lineId === it.lineId ? null : d))
                            updateLine(it.lineId, {
                              qty: (Number(it.qty) || 1) + 1,
                            })
                          }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="pos-col-price">
                      <button
                        type="button"
                        className="pos-price-btn"
                        onClick={(e) => {
                          if (editPriceLineId === it.lineId) {
                            setEditPriceLineId(null)
                            setPriceEditBaseline(null)
                            return
                          }
                          const r = e.currentTarget.getBoundingClientRect()
                          setPriceAnchor({ bottom: r.bottom, cx: r.left + r.width / 2 })
                          const current = sellPrice(it)
                          setPriceEditBaseline(
                            isSellPriceValid(current) ? current : snapSellPrice(current),
                          )
                          setEditPriceLineId(it.lineId)
                        }}
                      >
                        {formatMoney(sellPrice(it)).replace(' đ', '')}
                      </button>
                    </td>
                    <td className="pos-col-total">
                      {formatMoney(lineTotal(it)).replace(' đ', '')}
                    </td>
                  </tr>
                ))}
                {(!active || active.items.length === 0) && (
                  <tr>
                    <td colSpan={7} className="pos-cart-empty">
                      Quét mã hoặc tìm hàng để thêm vào hóa đơn
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button
              type="button"
              className="pos-add-nobarcode"
              onClick={() => setQuickOpen(true)}
            >
              <Plus size={18} strokeWidth={2.5} aria-hidden />
              Thêm hàng không có mã vạch
            </button>
          </div>

          <NoBarcodePickerDialog
            open={quickOpen}
            resumeInvoiceKey={active?.key}
            onClose={() => {
              setQuickOpen(false)
              requestAnimationFrame(() => searchRef.current?.focus())
            }}
            onPick={(product, qty, unitPrice, variant = null) => {
              setQuickOpen(false)
              addProduct(product, undefined, qty, variant)
              const variantId = variant?.id ?? null
              // Ghi đè đơn giá nếu Admin chỉnh khác giá danh mục
              const price = Number(unitPrice)
              if (Number.isFinite(price)) {
                patchActive((inv) => {
                  const first = inv.items.find(
                    (it) =>
                      String(it.productId) === String(product.id) &&
                      String(it.variantId ?? '') === String(variantId ?? ''),
                  )
                  if (!first) return inv
                  return {
                    ...inv,
                    items: inv.items.map((it) =>
                      it.lineId === first.lineId
                        ? { ...it, unitPrice: price, discountType: 'VND', discountValue: 0 }
                        : it,
                    ),
                  }
                })
              }
              const label = variant?.name ? `${product.name} — ${variant.name}` : product.name
              toast.success(`Đã thêm «${label}»`)
              requestAnimationFrame(() => searchRef.current?.focus())
            }}
          />

          {editing && priceAnchor && (() => {
            const popW = 280
            const left = Math.max(8, Math.min(priceAnchor.cx - popW / 2, window.innerWidth - popW - 8))
            const arrowX = Math.max(16, Math.min(priceAnchor.cx - left - 6, popW - 28))
            const priceNow = Number(editing.unitPrice) || 0
            const priceOk = isSellPriceValid(priceNow)
            const baseline =
              priceEditBaseline != null && isSellPriceValid(priceEditBaseline)
                ? priceEditBaseline
                : snapSellPrice(priceNow)

            function restoreBaselinePrice() {
              updateLine(editing.lineId, {
                unitPrice: baseline,
                discountType: 'VND',
                discountValue: 0,
              })
            }

            function closePricePop() {
              skipPriceBlurRef.current = true
              setEditPriceLineId(null)
              setPriceEditBaseline(null)
            }

            /** Giá sai → trả về giá lúc mở popover + báo; giá đúng → giữ. */
            function finishPricePop() {
              const attempted = Number(editing.unitPrice) || 0
              if (!isSellPriceValid(attempted)) {
                restoreBaselinePrice()
                const msg = sellPriceError(attempted)
                setError(msg)
                toast.error(msg)
              } else {
                setError('')
              }
              closePricePop()
            }

            function commitPricePop() {
              const attempted = Number(editing.unitPrice) || 0
              if (!isSellPriceValid(attempted)) {
                restoreBaselinePrice()
                const msg = sellPriceError(attempted)
                setError(msg)
                toast.error(msg)
                closePricePop()
                return false
              }
              setError('')
              closePricePop()
              return true
            }
            return (
              <>
                <div
                  className="pos-price-pop-backdrop"
                  onMouseDown={(e) => {
                    // mousedown: trước blur input — tránh xử lý blur trùng
                    e.preventDefault()
                    finishPricePop()
                  }}
                />
                <div
                  className="pos-price-pop"
                  style={{
                    top: priceAnchor.bottom + 10,
                    left,
                    width: popW,
                    '--arrow-x': `${arrowX}px`,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      restoreBaselinePrice()
                      setError('')
                      closePricePop()
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      commitPricePop()
                    }
                  }}
                >
                  <label className="pos-price-row">
                    <span>Đơn giá bán</span>
                    <input
                      inputMode="numeric"
                      autoFocus
                      value={formatMoneyInput(String(editing.unitPrice))}
                      onChange={(e) =>
                        updateLine(editing.lineId, {
                          unitPrice: Number(parseMoneyInput(e.target.value)) || 0,
                          discountType: 'VND',
                          discountValue: 0,
                        })
                      }
                      onBlur={() => {
                        if (skipPriceBlurRef.current) {
                          skipPriceBlurRef.current = false
                          return
                        }
                        const attempted = Number(editing.unitPrice) || 0
                        if (!isSellPriceValid(attempted)) {
                          restoreBaselinePrice()
                          const msg = sellPriceError(attempted)
                          setError(msg)
                          toast.error(msg)
                        }
                      }}
                    />
                  </label>
                  {!priceOk && (
                    <p className="pos-price-error" role="alert">
                      {sellPriceError(priceNow)}
                    </p>
                  )}
                  <p className="muted pos-price-hint">
                    Chỉ nhận tiền làm tròn như 20,000 hoặc 20,500. Thành tiền = SL × đơn giá bán.
                  </p>
                </div>
              </>
            )
          })()}

          <div className={`pos-note-row${showNoteHint ? ' pos-note-hint' : ''}`}>
            <span className="pos-note-icon">✎</span>
            <div className="pos-note-field">
              <input
                aria-label="Ghi chú đơn hàng"
                value={active?.note || ''}
                onFocus={() => setNoteInputFocused(true)}
                onBlur={() => setNoteInputFocused(false)}
                onChange={(e) => patchActive((inv) => ({ ...inv, note: e.target.value }))}
              />
              {showNoteHint ? (
                <span className="pos-note-placeholder" aria-hidden="true">
                  Ghi chú đơn hàng
                </span>
              ) : null}
            </div>
          </div>
        </section>

        <aside className="pos-pay">
          <div className="pos-pay-head">
            <span className="pos-pay-head-user">{username || 'admin'}</span>
            <span>{nowLabel}</span>
          </div>

          <div className="pos-sum-row">
            <span>
              Tổng tiền hàng <em>({itemCount})</em>
            </span>
            <strong>{formatMoney(merchandise).replace(' đ', '')}</strong>
          </div>
          <div className="pos-sum-row">
            <span>Giảm giá</span>
            <input
              className="pos-discount-input"
              value={formatMoneyInput(String(active?.discount || 0))}
              onChange={(e) =>
                patchActive((inv) => ({
                  ...inv,
                  discount: Number(parseMoneyInput(e.target.value)) || 0,
                }))
              }
            />
          </div>
          <div className="pos-sum-row pos-sum-due">
            <span>Khách cần trả</span>
            <strong>{formatMoney(due).replace(' đ', '')}</strong>
          </div>
          <div className="pos-sum-row">
            <span>Khách thanh toán</span>
            <input
              className="pos-paid-input"
              value={
                active?.paidInput === '' || active?.paidInput == null
                  ? formatMoneyInput(String(due))
                  : formatMoneyInput(parseMoneyInput(active.paidInput))
              }
              onChange={(e) =>
                patchActive((inv) => ({
                  ...inv,
                  paidInput: parseMoneyInput(e.target.value),
                }))
              }
            />
          </div>
          <div className="pos-sum-row pos-sum-change">
            <span>Tiền thừa trả khách</span>
            <strong>{change > 0 ? formatMoney(change).replace(' đ', '') : ''}</strong>
          </div>

          <div className="pos-pay-methods">
            {[
              ['CASH', 'Tiền mặt'],
              ['TRANSFER', 'Chuyển khoản'],
              ['DEBT', 'Nợ'],
            ].map(([code, label]) => (
              <label key={code} className="pos-pay-method">
                <input
                  type="radio"
                  name={`pay-${activeKey}`}
                  checked={(active?.paymentMethod || 'CASH') === code}
                  onChange={() => selectPaymentMethod(code)}
                />
                {label}
              </label>
            ))}
          </div>

          <button
            type="button"
            className="pos-checkout-btn"
            disabled={busy || !active?.items.length}
            onClick={checkout}
          >
            {busy ? (
              'Đang xử lý…'
            ) : active?.amendSaleId ? (
              <>
                <Banknote size={22} strokeWidth={2.25} aria-hidden />
                Cập nhật hóa đơn
              </>
            ) : (active?.paymentMethod || 'CASH') === 'DEBT' ? (
              <>
                <NotebookPen size={22} strokeWidth={2.25} aria-hidden />
                GHI NỢ
              </>
            ) : (
              <>
                <Banknote size={22} strokeWidth={2.25} aria-hidden />
                THANH TOÁN
              </>
            )}
          </button>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmDebt}
        title="Xác nhận ghi nợ"
        message="Bạn có chắc chắn ghi nợ hóa đơn này không?"
        confirmLabel="Đồng ý"
        cancelLabel="Hủy"
        onClose={() => setConfirmDebt(false)}
        onConfirm={confirmDebtMode}
      />

      <ConfirmDialog
        open={Boolean(confirmCloseTab)}
        elevated
        cardClassName="pos-close-tab-dialog"
        title={confirmCloseTab ? `Đóng ${confirmCloseTab.title}` : ''}
        confirmLabel="Đồng ý"
        cancelLabel="Bỏ qua"
        danger
        onClose={() => setConfirmCloseTab(null)}
        onConfirm={() => {
          const key = confirmCloseTab?.key
          setConfirmCloseTab(null)
          if (key) closeTab(key)
        }}
      >
        {confirmCloseTab && (
          <p className="pos-close-tab-message">
            Đóng <strong>{confirmCloseTab.title}</strong> sẽ xóa nháp hàng trên máy (không tạo hóa
            đơn / không thanh toán). Bạn có chắc muốn đóng không?
          </p>
        )}
      </ConfirmDialog>

      <footer className="pos-footer">
        <span className="pos-mode active">Bán nhanh</span>
        <Link to="/sales" className="pos-mode">
          Lịch sử bán
        </Link>
      </footer>

      {postSale && !postSale.showPrint && (
        <div className="pos-modal-backdrop">
          <div className="pos-modal">
            <h2>{postSale.amendedFrom ? 'Cập nhật hóa đơn thành công' : 'Thanh toán thành công'}</h2>
            <p>
              Hóa đơn <strong>{postSale.sale.code}</strong> —{' '}
              {formatMoney(postSale.sale.totalAmount)}
              {postSale.amendedFrom ? (
                <>
                  <br />
                  <span className="muted">Thay cho {postSale.amendedFrom}</span>
                </>
              ) : null}
            </p>
            <div className="pos-modal-actions">
              <button type="button" onClick={() => finishPostSale(true)}>
                In hóa đơn
              </button>
              <button type="button" className="ghost" onClick={() => finishPostSale(false)}>
                Hủy (không in)
              </button>
            </div>
          </div>
        </div>
      )}

      {postSale?.showPrint && (
        <SalePrintPreview
          sale={postSale.sale}
          customerName={postSale.customerName || postSale.sale.customerName}
          onClose={() => completePostSale(postSale.invoiceKey)}
          onPrint={confirmSalePrint}
        />
      )}
    </div>
  )
}

function formatReceiptDate(d) {
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function SalePrintPreview({ sale, customerName, onClose, onPrint }) {
  const printedAt = useMemo(() => new Date(), [])
  return (
    <div className="print-preview-backdrop">
      <div className="print-preview-card">
        <div className="print-preview-toolbar no-print">
          <h2>Xem trước hóa đơn</h2>
          <div className="print-preview-actions">
            <button type="button" onClick={onPrint}>
              In
            </button>
            <button type="button" className="ghost" onClick={onClose}>
              Đóng
            </button>
          </div>
        </div>
        <div className="print-preview-body">
          <div className="receipt">
            <div className="receipt-head">
              <p className="receipt-store">Tạp hóa Phúc Sơn</p>
              <p className="receipt-title">HÓA ĐƠN MUA HÀNG</p>
              <p>{formatReceiptDate(printedAt)}</p>
              <p>
                Mã HĐ: <strong>{sale.code}</strong>
              </p>
              {customerName ? (
                <p>
                  Khách hàng: <strong>{customerName}</strong>
                </p>
              ) : (
                <p>Khách lẻ</p>
              )}
            </div>
            <table className="receipt-table">
              <thead>
                <tr>
                  <th>Hàng</th>
                  <th>SL</th>
                  <th>Đ.giá</th>
                  <th>T.tiền</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items || []).map((it) => (
                  <tr key={it.id || it.productId}>
                    <td>
                      {it.productName}
                      {it.unitName ? ` (${it.unitName})` : ''}
                    </td>
                    <td>{it.qty}</td>
                    <td>{formatMoney(it.unitPrice)}</td>
                    <td>{formatMoney(it.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="receipt-summary">
              {Number(sale.discountAmount) > 0 && (
                <div className="receipt-summary-row">
                  <span>Giảm giá</span>
                  <span>{formatMoney(sale.discountAmount)}</span>
                </div>
              )}
              <div className="receipt-summary-row receipt-summary-total">
                <span>Tổng cộng</span>
                <span>{formatMoney(sale.totalAmount)}</span>
              </div>
              <div className="receipt-summary-row">
                <span>Đã trả</span>
                <span>{formatMoney(sale.paidAmount)}</span>
              </div>
              {Number(sale.debtAmount) > 0 && (
                <div className="receipt-summary-row">
                  <span>Còn nợ</span>
                  <span>{formatMoney(sale.debtAmount)}</span>
                </div>
              )}
            </div>
            <p className="receipt-thanks">Cảm ơn quý khách!</p>
          </div>
        </div>
      </div>
    </div>
  )
}
