import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../shared/api'
import { formatMoney, parseMoneyInput } from '../../shared/format'
import { isSellPriceValid, sellPriceError, snapSellPrice } from '../../shared/priceStep'
import ProductThumb from '../../shared/ProductThumb'
import MoneyInput from '../../shared/MoneyInput'

/**
 * Chọn hàng không có mã vạch từ danh mục.
 * Hàng nhiều kiểu dáng: một tên, các nút kiểu — bấm kiểu nào hiện ảnh và giá của kiểu đó.
 */

function variantSellPrice(product, variant) {
  if (variant && variant.sellPrice != null && variant.sellPrice !== '') {
    return Number(variant.sellPrice) || 0
  }
  return Number(product?.sellPrice) || 0
}
export default function NoBarcodePickerDialog({
  open,
  onClose,
  onPick,
  resumeInvoiceKey,
}) {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [qty, setQty] = useState('1')
  const [sell, setSell] = useState('')
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    if (!open) return
    setQ('')
    setQuery('')
    setSelected(null)
    setQty('1')
    setSell('')
    setConfirmError('')
    setError('')
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const t = setTimeout(() => setQuery(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q, open])

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false
    setLoading(true)
    setError('')
    api(
      `/api/products?q=${encodeURIComponent(query)}&codeType=nobarcode&activeOnly=true&page=0&size=40`,
      { inlineErrors: true },
    )
      .then((res) => {
        if (cancelled) return
        setItems(res?.content || [])
      })
      .catch((e) => {
        if (cancelled) return
        setItems([])
        setError(e.message || 'Không tải được danh sách')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, query])

  const rows = useMemo(
    () =>
      items.map((p) => {
        const variants = Array.isArray(p.variants) ? p.variants : []
        return {
          product: p,
          variants,
          sellPrice: variantSellPrice(p, null),
          hasImage: Boolean(p.hasImage),
        }
      }),
    [items],
  )

  if (!open) return null

  function choose(row) {
    setSelected({ product: row.product, variant: null })
    setQty('1')
    setSell(String(Math.round(variantSellPrice(row.product, null))))
    setConfirmError('')
  }

  function pickVariant(variant) {
    if (!selected) return
    setSelected({ product: selected.product, variant })
    setSell(String(Math.round(variantSellPrice(selected.product, variant))))
    setConfirmError('')
  }

  function confirm() {
    if (!selected) return
    const nQty = Math.max(1, Math.floor(Number(qty) || 1))
    const price = Number(parseMoneyInput(sell)) || 0
    if (!isSellPriceValid(price)) {
      setConfirmError(sellPriceError(price))
      return
    }
    onPick(selected.product, nQty, price, selected.variant)
  }

  const emptyCatalog = !loading && !error && !query && items.length === 0
  const noResults = !loading && !error && query && items.length === 0

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card nobarcode-picker-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nobarcode-picker-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
        }}
      >
        <h2 id="nobarcode-picker-title">Chọn hàng không có mã vạch</h2>
        <p className="muted nobarcode-picker-hint">
          Chọn hàng. Nếu có nhiều kiểu dáng, bấm tên kiểu để xem ảnh và giá của kiểu đó.
        </p>

        {!selected ? (
          <>
            <input
              className="search nobarcode-picker-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm theo tên hàng…"
              autoFocus
            />
            <div className="nobarcode-picker-list">
              {loading && <p className="muted nobarcode-picker-state">Đang tải…</p>}
              {error && (
                <p className="error nobarcode-picker-state" role="alert">
                  {error}
                </p>
              )}
              {emptyCatalog && (
                <p className="muted nobarcode-picker-state">
                  Chưa có hàng không mã vạch trong danh mục. Tạo mới để bán lần sau.
                </p>
              )}
              {noResults && (
                <p className="muted nobarcode-picker-state">Không tìm thấy «{query}»</p>
              )}
              {!loading &&
                !error &&
                rows.map((row) => (
                  <div
                    key={row.product.id}
                    role="button"
                    tabIndex={0}
                    className="nobarcode-picker-item"
                    onClick={() => choose(row)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        choose(row)
                      }
                    }}
                  >
                    <ProductThumb
                      productId={row.product.id}
                      hasImage={row.hasImage}
                      alt={row.product.name}
                    />
                    <span className="nobarcode-picker-item-body">
                      <strong>{row.product.name}</strong>
                      <span className="muted">
                        {row.product.unit || 'Cái'}
                        {row.product.category ? ` · ${row.product.category}` : ''}
                        {row.variants.length > 0
                          ? ` · ${row.variants.length + 1} kiểu dáng`
                          : ''}
                      </span>
                      <span className="nobarcode-picker-prices">
                        <span>
                          Giá bán <b>{formatMoney(row.sellPrice)}</b>
                        </span>
                      </span>
                    </span>
                  </div>
                ))}
            </div>
            <div className="actions nobarcode-picker-actions">
              <Link
                className="btn btn-create"
                to="/products/new"
                state={{ noBarcode: true, fromPos: true, resumeInvoiceKey }}
                onClick={onClose}
              >
                <Plus size={18} strokeWidth={2.25} aria-hidden />
                Tạo hàng mới
              </Link>
              <button type="button" className="btn-cancel" onClick={onClose}>
                Đóng
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="variant-stage">
              <ProductThumb
                productId={selected.product.id}
                variantId={selected.variant?.hasImage ? selected.variant.id : null}
                hasImage={
                  Boolean(selected.variant?.hasImage) || Boolean(selected.product.hasImage)
                }
                alt={
                  selected.variant
                    ? `${selected.product.name} — ${selected.variant.name}`
                    : selected.product.name
                }
                className="product-thumb--lg"
              />
              <div className="variant-stage-body">
                <strong className="variant-stage-name">{selected.product.name}</strong>
                <div className="muted">{selected.product.unit || 'Cái'}</div>
                {(selected.product.variants || []).length > 0 && (
                  <div className="variant-style-row" role="radiogroup" aria-label="Kiểu dáng">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={!selected.variant}
                      className={`variant-style-btn${!selected.variant ? ' is-active' : ''}`}
                      onClick={() => pickVariant(null)}
                    >
                      Mặc định
                    </button>
                    {selected.product.variants.map((v) => {
                      const active = String(selected.variant?.id) === String(v.id)
                      return (
                        <button
                          key={v.id}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={`variant-style-btn${active ? ' is-active' : ''}`}
                          onClick={() => pickVariant(v)}
                        >
                          {v.name}
                        </button>
                      )
                    })}
                  </div>
                )}
                <div className="variant-stage-price">{formatMoney(sell)}</div>
              </div>
            </div>
            <div className="quick-product-row">
              <label className="quick-product-field">
                Số lượng
                <input
                  inputMode="numeric"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onFocus={(e) => e.target.select()}
                />
              </label>
              <label className="quick-product-field">
                Đơn giá bán
                <MoneyInput
                  value={sell}
                  maxDigits={9}
                  onValueChange={setSell}
                  placeholder="0 đ"
                  onBlur={() => {
                    if (!isSellPriceValid(Number(sell) || 0)) {
                      setSell(String(snapSellPrice(Number(sell) || 0)))
                    }
                  }}
                />
              </label>
            </div>
            {confirmError && (
              <p className="error" role="alert">
                {confirmError}
              </p>
            )}
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={() => setSelected(null)}>
                Quay lại
              </button>
              <button type="button" onClick={confirm}>
                Thêm vào hóa đơn
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
