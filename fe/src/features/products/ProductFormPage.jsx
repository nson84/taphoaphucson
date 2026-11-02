import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { api, apiUpload } from '../../shared/api'
import ConfirmDialog from '../../shared/ConfirmDialog'
import { formatMoneyInput, parseMoneyInput } from '../../shared/format'
import { isSellPriceValid, sellPriceError } from '../../shared/priceStep'
import ProductThumb from '../../shared/ProductThumb'
import { useToast } from '../../shared/ToastContext'
import { useLeaveGuard } from '../../shared/useLeaveGuard'

function foldVi(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

/** Ảnh kiểu dáng: file mới chọn / ảnh đã lưu / placeholder. */
function VariantImageBox({ productId, variant }) {
  const [localUrl, setLocalUrl] = useState('')
  useEffect(() => {
    if (!variant.imageFile) {
      setLocalUrl('')
      return undefined
    }
    const url = URL.createObjectURL(variant.imageFile)
    setLocalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [variant.imageFile])

  if (localUrl) {
    return <img className="product-thumb product-thumb--lg" src={localUrl} alt="" />
  }
  if (variant.hasImage && !variant.removeImage && productId && variant.id) {
    return (
      <ProductThumb
        productId={productId}
        variantId={variant.id}
        hasImage
        zoomable={false}
        className="product-thumb--lg"
        alt={variant.name}
      />
    )
  }
  return <div className="product-thumb product-thumb--ph product-thumb--lg" aria-hidden />
}

function CategorySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const wrapRef = useRef(null)
  const searchRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
    }
  }, [open])

  const q = foldVi(query.trim())
  const options = [
    ...(value && !CATEGORIES.includes(value) ? [value] : []),
    ...CATEGORIES,
  ].filter((name) => !q || foldVi(name).includes(q))

  return (
    <div className="category-select" ref={wrapRef}>
      <button
        type="button"
        className="category-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          setQuery('')
          setOpen((v) => !v)
        }}
      >
        <span className={value ? '' : 'is-placeholder'}>{value || '— Chọn nhóm hàng —'}</span>
        <ChevronDown size={18} strokeWidth={2.25} aria-hidden />
      </button>
      {open && (
        <div className="category-select-menu">
          <input
            ref={searchRef}
            className="category-select-search"
            type="search"
            placeholder="Tìm nhóm hàng..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Tìm nhóm hàng"
          />
          <ul className="category-select-list" role="listbox" aria-label="Nhóm hàng">
            {options.length === 0 && <li className="category-select-empty">Không có nhóm phù hợp</li>}
            {options.map((name) => (
              <li key={name}>
                <button
                  type="button"
                  role="option"
                  aria-selected={name === value}
                  className={`category-select-option${name === value ? ' is-active' : ''}`}
                  onClick={() => {
                    onChange(name)
                    setOpen(false)
                  }}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const CATEGORIES = [
  'Nước giải khát',
  'Bia & rượu',
  'Cà phê & trà',
  'Sữa',
  'Kem',
  'Bánh mì & bánh bao',
  'Bánh',
  'Kẹo & socola',
  'Snack',
  'Mì, phở, cháo',
  'Gia vị & bột',
  'Gạo, ngũ cốc & hạt',
  'Thực phẩm chế biến',
  'Mỹ phẩm & chăm sóc da',
  'Dầu gội & sữa tắm',
  'Răng miệng',
  'Giặt giũ & vệ sinh nhà',
  'Băng vệ sinh',
  'Mẹ & bé',
  'Giấy & khăn giấy',
  'Đồ cá nhân',
  'Đồ dùng gia đình',
  'Văn phòng phẩm',
  'Đồ chơi',
  'Pin & điện',
  'Thuốc & y tế',
  'Thuốc lá & bật lửa',
  'Khác',
]

const emptyExtra = () => ({
  key: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  factor: '24',
  sellPrice: '',
  costPrice: '',
})

const emptyVariant = () => ({
  key: `v-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  id: null,
  name: '',
  sellPrice: '',
  costPrice: '',
  customPrice: false,
  hasImage: false,
  imageFile: null,
  imagePreview: '',
  removeImage: false,
})

const empty = {
  barcode: '',
  name: '',
  category: '',
  costPrice: '',
  sellPrice: '',
  stockQty: '0',
  baseUnit: 'Gói',
  active: true,
  extras: [],
  variants: [],
}

/** Bỏ File/preview khỏi so sánh dirty (không serialize được ổn định). */
function snapshotForm(f) {
  return {
    ...f,
    variants: (f.variants || []).map(({ imageFile, imagePreview, ...rest }) => rest),
  }
}

export default function ProductFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const fromPos = Boolean(location.state?.fromPos)
  const posResumeKey = location.state?.resumeInvoiceKey || null
  const posBarcode = !isEdit && location.state?.barcode ? String(location.state.barcode).trim() : ''
  const startNoBarcode = !isEdit && Boolean(location.state?.noBarcode) && !posBarcode
  const [form, setForm] = useState(() =>
    posBarcode ? { ...empty, barcode: posBarcode } : empty,
  )
  const [noBarcode, setNoBarcode] = useState(startNoBarcode)
  const [internalCode, setInternalCode] = useState('')
  const [hasImage, setHasImage] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  /** Ảnh chụp form lúc mở/tải xong — so với form hiện tại để biết đang nhập dở. Sửa: chờ tải xong. */
  const [baseline, setBaseline] = useState(() =>
    isEdit ? null : JSON.stringify(snapshotForm(posBarcode ? { ...empty, barcode: posBarcode } : empty)),
  )
  const imagesDirty =
    Boolean(imageFile) ||
    form.variants.some((v) => Boolean(v.imageFile) || Boolean(v.removeImage))
  const dirty =
    baseline !== null && (JSON.stringify(snapshotForm(form)) !== baseline || imagesDirty)

  const { dialog: leaveDialog, allowLeave } = useLeaveGuard({
    dirty,
    title: isEdit ? 'Thoát khi đang sửa hàng hóa?' : 'Thoát khi đang tạo hàng hóa?',
    message: isEdit
      ? 'Bạn đang sửa dở hàng hóa này. Nếu thoát, các thay đổi chưa lưu sẽ mất. Bạn có muốn thoát không?'
      : 'Bạn đang tạo dở hàng hóa mới. Nếu thoát, thông tin đã nhập sẽ mất. Bạn có muốn thoát không?',
    confirmLabel: 'Thoát',
    cancelLabel: isEdit ? 'Ở lại tiếp tục sửa' : 'Ở lại tiếp tục tạo',
  })

  /** Hàng đã có mã vạch đang nhập (null = chưa trùng). */
  const [dup, setDup] = useState(null)
  const [dupOpen, setDupOpen] = useState(false)
  const dismissedCodeRef = useRef('')
  const barcodeInputRef = useRef(null)

  async function lookupBarcode(raw) {
    const code = String(raw || '').trim()
    if (!code) return null
    const qs = new URLSearchParams({ code })
    if (isEdit) qs.set('excludeId', id)
    try {
      const res = await api(`/api/products/barcode-check?${qs.toString()}`, { inlineErrors: true })
      return res?.exists ? { ...res, code } : null
    } catch {
      return null // lỗi mạng: để BE chặn khi lưu
    }
  }

  async function runBarcodeCheck(raw, { force = false } = {}) {
    const found = await lookupBarcode(raw)
    // bỏ kết quả cũ nếu người dùng đã gõ mã khác trong lúc chờ
    if (String(raw || '').trim() !== barcodeNowRef.current.trim()) return found
    setDup(found)
    if (found && (force || dismissedCodeRef.current !== found.code)) setDupOpen(true)
    return found
  }

  const barcodeNowRef = useRef(form.barcode)
  barcodeNowRef.current = form.barcode

  useEffect(() => {
    const code = form.barcode.trim()
    if (!code) {
      setDup(null)
      return undefined
    }
    if (dup && dup.code !== code) setDup(null)
    const t = setTimeout(() => {
      runBarcodeCheck(code)
    }, 450)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.barcode, id])

  function stayWithOtherBarcode() {
    if (dup) dismissedCodeRef.current = dup.code
    setDupOpen(false)
    barcodeInputRef.current?.focus()
  }

  function gotoDuplicateProduct() {
    if (!dup) return
    setDupOpen(false)
    allowLeave()
    navigate(`/products/${dup.productId}/edit`, {
      state: fromPos ? { fromPos: true, resumeInvoiceKey: posResumeKey } : undefined,
    })
  }

  useEffect(() => {
    if (isEdit) return
    if (!posBarcode) return
    setForm((f) => (f.barcode ? f : { ...f, barcode: posBarcode }))
  }, [isEdit, posBarcode])

  useEffect(() => {
    if (!isEdit) return
    setBaseline(null)
    setDup(null)
    setDupOpen(false)
    dismissedCodeRef.current = ''
    api(`/api/products/${id}`)
      .then((p) => {
        const units = p.units || []
        const base = units.find((u) => u.base) || units[0]
        const extras = units
          .filter((u) => !u.base && u.id !== base?.id)
          .map((u) => ({
            key: `u-${u.id}`,
            id: u.id,
            name: u.name || '',
            factor: String(u.factor || 1),
            sellPrice: String(Math.round(Number(u.sellPrice) || 0)),
            costPrice: String(Math.round(Number(u.costPrice) || 0)),
          }))
        const noPhys = p.hasPhysicalBarcode === false
        const variants = (p.variants || []).map((v) => {
          const custom = v.sellPrice != null && v.sellPrice !== ''
          return {
            key: `v-${v.id}`,
            id: v.id,
            name: v.name || '',
            sellPrice: custom ? String(Math.round(Number(v.sellPrice) || 0)) : '',
            costPrice:
              v.costPrice != null && v.costPrice !== ''
                ? String(Math.round(Number(v.costPrice) || 0))
                : '',
            customPrice: custom,
            hasImage: Boolean(v.hasImage),
            imageFile: null,
            imagePreview: '',
            removeImage: false,
          }
        })
        const loaded = {
          barcode: noPhys ? '' : p.barcode || '',
          name: p.name || '',
          category: p.category || '',
          costPrice: String(Math.round(Number(p.costPrice) || 0)),
          sellPrice: String(Math.round(Number(p.sellPrice) || 0)),
          stockQty: String(p.stockQty ?? 0),
          baseUnit: base?.name || p.unit || 'Gói',
          active: p.active !== false,
          extras,
          variants,
        }
        setNoBarcode(noPhys)
        setInternalCode(noPhys ? p.barcode || '' : '')
        setHasImage(Boolean(p.hasImage))
        setImageFile(null)
        setImagePreview('')
        setForm(loaded)
        setBaseline(JSON.stringify(snapshotForm(loaded)))
      })
      .catch((e) => setError(e.message))
  }, [id, isEdit])

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('')
      return undefined
    }
    const url = URL.createObjectURL(imageFile)
    setImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [imageFile])

  function buildBody() {
    const cost = Number(parseMoneyInput(form.costPrice)) || 0
    const sell = Number(parseMoneyInput(form.sellPrice)) || 0
    const baseName = form.baseUnit.trim() || 'Gói'
    const units = [
      {
        name: baseName,
        factor: 1,
        sellPrice: sell,
        costPrice: cost,
        base: true,
      },
      ...form.extras
        .filter((u) => u.name.trim())
        .map((u) => {
          const factor = Math.max(1, Number(u.factor) || 1)
          return {
            name: u.name.trim(),
            factor,
            sellPrice: Number(parseMoneyInput(u.sellPrice)) || 0,
            costPrice:
              u.costPrice === '' || u.costPrice == null
                ? cost * factor
                : Number(parseMoneyInput(u.costPrice)) || 0,
            base: false,
          }
        }),
    ]
    const variants = form.variants
      .filter((v) => v.name.trim())
      .map((v) => {
        const row = { name: v.name.trim() }
        if (v.id) row.id = v.id
        if (v.customPrice) {
          row.sellPrice = Number(parseMoneyInput(v.sellPrice)) || 0
          if (v.costPrice !== '' && v.costPrice != null) {
            row.costPrice = Number(parseMoneyInput(v.costPrice)) || 0
          }
        }
        return row
      })
    return {
      barcode: noBarcode ? '' : form.barcode.trim(),
      name: form.name.trim(),
      category: form.category.trim(),
      costPrice: cost,
      sellPrice: sell,
      stockQty: Number(form.stockQty) || 0,
      unit: baseName,
      units,
      variants,
      active: form.active,
    }
  }

  async function uploadImageIfNeeded(productId) {
    if (!imageFile || !productId) return
    const fd = new FormData()
    fd.append('file', imageFile)
    await apiUpload(`/api/products/${productId}/image`, fd)
  }

  async function syncVariantImages(productId, savedVariants) {
    if (!productId) return
    const saved = savedVariants || []
    const used = new Set()
    for (const local of form.variants.filter((v) => v.name.trim())) {
      let remote = local.id ? saved.find((s) => s.id === local.id) : null
      if (!remote) {
        remote = saved.find((s) => s.name === local.name.trim() && !used.has(s.id))
      }
      const variantId = remote?.id
      if (!variantId) continue
      used.add(variantId)
      if (local.removeImage && !local.imageFile) {
        await api(`/api/products/${productId}/variants/${variantId}/image`, { method: 'DELETE' })
      }
      if (local.imageFile) {
        const fd = new FormData()
        fd.append('file', local.imageFile)
        await apiUpload(`/api/products/${productId}/variants/${variantId}/image`, fd)
      }
    }
  }

  async function save(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.category.trim()) {
      setError('Chọn nhóm hàng và nhập tên hàng')
      return
    }
    if (!noBarcode && !form.barcode.trim()) {
      setError('Nhập mã vạch hoặc chọn «Không có mã vạch»')
      return
    }
    const sell = Number(parseMoneyInput(form.sellPrice)) || 0
    if (!isSellPriceValid(sell)) {
      setError(sellPriceError(sell))
      return
    }
    for (const u of form.extras.filter((x) => x.name.trim())) {
      const sp = Number(parseMoneyInput(u.sellPrice)) || 0
      if (!isSellPriceValid(sp)) {
        setError(`Đơn vị «${u.name}»: ${sellPriceError(sp)}`)
        return
      }
    }
    for (const v of form.variants.filter((x) => x.name.trim() && x.customPrice)) {
      const sp = Number(parseMoneyInput(v.sellPrice)) || 0
      if (!isSellPriceValid(sp)) {
        setError(`Kiểu «${v.name}»: ${sellPriceError(sp)}`)
        return
      }
    }
    setBusy(true)
    try {
      if (!noBarcode) {
        const found = await runBarcodeCheck(form.barcode, { force: true })
        if (found) {
          setBusy(false)
          return
        }
      }
      const body = buildBody()
      if (isEdit) {
        const updated = await api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(body) })
        await uploadImageIfNeeded(id)
        await syncVariantImages(id, updated?.variants)
        toast.success('Đã cập nhật hàng hóa')
        allowLeave()
        navigate(fromPos ? '/pos' : '/products', {
          state: fromPos && posResumeKey ? { resumeInvoiceKey: posResumeKey } : undefined,
        })
      } else {
        const created = await api('/api/products', {
          method: 'POST',
          body: JSON.stringify(body),
        })
        await uploadImageIfNeeded(created?.id)
        await syncVariantImages(created?.id, created?.variants)
        toast.success('Đã thêm hàng hóa')
        allowLeave()
        if (fromPos) {
          navigate('/pos', {
            state: {
              resumeInvoiceKey: posResumeKey,
              addProductId: created?.id,
              addProductBarcode: created?.barcode || body.barcode,
            },
          })
        } else {
          navigate('/products')
        }
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const backTo = fromPos
    ? { pathname: '/pos', state: posResumeKey ? { resumeInvoiceKey: posResumeKey } : undefined }
    : '/products'

  return (
    <section className="panel form-page product-form-page">
      <div className="form-page-head">
        <Link className="form-back" to={backTo.pathname || backTo} state={backTo.state}>
          {fromPos ? '← Bán hàng' : '← Hàng hóa'}
        </Link>
        <h1>{isEdit ? 'Sửa hàng hóa' : 'Tạo hàng hóa'}</h1>
        <span className={`product-kind-badge${noBarcode ? ' is-nobarcode' : ''}`}>
          {noBarcode ? 'Không có mã vạch' : 'Có mã vạch'}
        </span>
      </div>
      {error && <p className="error form-error">{error}</p>}
      {leaveDialog}
      <ConfirmDialog
        open={dupOpen && Boolean(dup)}
        title="Mã vạch này đã có hàng hóa"
        message={
          dup
            ? `Mã vạch ${dup.code} đã có hàng hóa «${dup.name}»${dup.active ? '' : ' (đã ngừng bán)'}. Không thể thêm trùng. Bạn có muốn tới sản phẩm này không?`
            : ''
        }
        confirmLabel="Tới sản phẩm này"
        cancelLabel="Nhập mã khác"
        onClose={stayWithOtherBarcode}
        onConfirm={gotoDuplicateProduct}
      />
      <form className="product-form" onSubmit={save}>
        <div className="product-form-section">
          <h2>Thông tin</h2>
          <label className="inventory-toggle product-nobarcode-toggle">
            <input
              type="checkbox"
              checked={noBarcode}
              onChange={(e) => {
                const on = e.target.checked
                setNoBarcode(on)
                setDup(null)
                setDupOpen(false)
                if (on) setForm((f) => ({ ...f, barcode: '' }))
              }}
            />
            <span>Không có mã vạch (hệ thống tự cấp mã nội bộ)</span>
          </label>
          <div className="product-form-grid">
            {!noBarcode ? (
            <label>
              Mã vạch
              <input
                ref={barcodeInputRef}
                value={form.barcode}
                onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                onKeyDown={(e) => {
                  // Máy quét kết thúc bằng Enter: kiểm tra mã ngay, không submit form dở
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    runBarcodeCheck(form.barcode, { force: true })
                  }
                }}
                onBlur={() => runBarcodeCheck(form.barcode)}
                placeholder="Nhập mã vạch"
                aria-invalid={dup ? 'true' : undefined}
                required
              />
              {dup && (
                <span className="field-error product-barcode-dup" role="alert">
                  Mã này đã có hàng «{dup.name}»{dup.active ? '' : ' (đã ngừng bán)'}.{' '}
                  <button type="button" className="link-btn" onClick={gotoDuplicateProduct}>
                    Tới sản phẩm này
                  </button>
                </span>
              )}
            </label>
            ) : (
            <label>
              Mã nội bộ
              <input
                value={internalCode || (isEdit ? 'Đã cấp' : 'Tự cấp khi lưu')}
                disabled
                readOnly
              />
            </label>
            )}
            <label>
              Nhóm hàng
              <CategorySelect
                value={form.category}
                onChange={(category) => setForm((f) => ({ ...f, category }))}
              />
            </label>
            <label className="product-form-span2">
              Tên hàng
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Bắt buộc"
                required
              />
            </label>
          </div>
        </div>

        <div className="product-form-section">
          <h2>Giá vốn, giá bán</h2>
          <div className="product-form-grid product-form-grid--prices">
            <label>
              Giá vốn (đơn vị cơ bản)
              <input
                value={formatMoneyInput(form.costPrice)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, costPrice: parseMoneyInput(e.target.value) }))
                }
                inputMode="numeric"
                placeholder="0"
              />
            </label>
            <label>
              Giá bán (đơn vị cơ bản)
              <input
                value={formatMoneyInput(form.sellPrice)}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sellPrice: parseMoneyInput(e.target.value) }))
                }
                inputMode="numeric"
                placeholder="0"
              />
              <span className="product-form-hint">Chỉ nhận số kết thúc ,000 hoặc ,500 (7,000 · 7,500…)</span>
            </label>
          </div>
        </div>

        <div className="product-form-section">
          <h2>Ảnh mặc định</h2>
          <p className="product-form-hint">
            Ảnh chung của hàng. Nếu có nhiều kiểu dáng bên dưới, mỗi kiểu nên có ảnh riêng để dễ chọn khi bán.
          </p>
          <div className="product-image-edit">
            {imagePreview ? (
              <img className="product-thumb product-thumb--lg" src={imagePreview} alt="" />
            ) : hasImage && isEdit ? (
              <ProductThumb productId={id} hasImage className="product-thumb--lg" alt={form.name} />
            ) : (
              <div className="product-thumb product-thumb--ph product-thumb--lg" aria-hidden />
            )}
            <div className="product-image-actions">
              <label className="btn btn-cancel">
                Chọn ảnh
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) setImageFile(f)
                  }}
                />
              </label>
              {(imageFile || hasImage) && (
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={async () => {
                    setImageFile(null)
                    setImagePreview('')
                    if (isEdit && hasImage) {
                      try {
                        await api(`/api/products/${id}/image`, { method: 'DELETE' })
                        setHasImage(false)
                        toast.success('Đã xóa ảnh')
                      } catch (err) {
                        setError(err.message)
                      }
                    }
                  }}
                >
                  Xóa ảnh
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="product-form-section">
          <h2>Kiểu dáng / màu sắc</h2>
          <p className="product-form-hint">
            Cùng tên và nhóm hàng; mỗi kiểu có ảnh riêng. Để trống giá = dùng giá chung ở trên; bật «Giá riêng»
            nếu kiểu đó bán khác giá.
          </p>
          <div className="product-variant-list">
            {form.variants.map((v, idx) => (
              <div key={v.key} className="product-variant-row">
                <VariantImageBox productId={isEdit ? id : null} variant={v} />
                <div className="product-variant-fields">
                  <label>
                    Tên kiểu
                    <input
                      value={v.name}
                      placeholder="Tròn, Vuông, Đỏ…"
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.map((x, i) =>
                            i === idx ? { ...x, name: e.target.value } : x,
                          ),
                        }))
                      }
                    />
                  </label>
                  <label className="inventory-toggle product-variant-price-toggle">
                    <input
                      type="checkbox"
                      checked={v.customPrice}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.map((x, i) =>
                            i === idx
                              ? {
                                  ...x,
                                  customPrice: e.target.checked,
                                  sellPrice: e.target.checked ? x.sellPrice || f.sellPrice : '',
                                  costPrice: e.target.checked ? x.costPrice || f.costPrice : '',
                                }
                              : x,
                          ),
                        }))
                      }
                    />
                    <span>Giá riêng</span>
                  </label>
                  {v.customPrice && (
                    <>
                      <label>
                        Giá bán
                        <input
                          value={formatMoneyInput(v.sellPrice)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              variants: f.variants.map((x, i) =>
                                i === idx
                                  ? { ...x, sellPrice: parseMoneyInput(e.target.value) }
                                  : x,
                              ),
                            }))
                          }
                          inputMode="numeric"
                        />
                      </label>
                      <label>
                        Giá vốn
                        <input
                          value={formatMoneyInput(v.costPrice)}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              variants: f.variants.map((x, i) =>
                                i === idx
                                  ? { ...x, costPrice: parseMoneyInput(e.target.value) }
                                  : x,
                              ),
                            }))
                          }
                          inputMode="numeric"
                          placeholder="Tuỳ chọn"
                        />
                      </label>
                    </>
                  )}
                  <div className="product-image-actions">
                    <label className="btn btn-cancel">
                      Chọn ảnh
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          e.target.value = ''
                          if (!file) return
                          setForm((f) => ({
                            ...f,
                            variants: f.variants.map((x, i) =>
                              i === idx
                                ? { ...x, imageFile: file, removeImage: false }
                                : x,
                            ),
                          }))
                        }}
                      />
                    </label>
                    {(v.imageFile || (v.hasImage && !v.removeImage)) && (
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            variants: f.variants.map((x, i) =>
                              i === idx
                                ? {
                                    ...x,
                                    imageFile: null,
                                    imagePreview: '',
                                    removeImage: Boolean(x.hasImage),
                                    hasImage: false,
                                  }
                                : x,
                            ),
                          }))
                        }
                      >
                        Xóa ảnh
                      </button>
                    )}
                    <button
                      type="button"
                      className="ghost ghost-danger"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          variants: f.variants.filter((_, i) => i !== idx),
                        }))
                      }
                    >
                      Xóa kiểu
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ghost product-unit-add"
            onClick={() => setForm((f) => ({ ...f, variants: [...f.variants, emptyVariant()] }))}
          >
            + Thêm kiểu dáng / màu
          </button>
        </div>

        <div className="product-form-section">
          <h2>Tồn kho</h2>
          <p className="product-form-hint">
            Tồn theo đơn vị cơ bản (vd. số gói). Bán thùng sẽ trừ theo hệ số quy đổi.
          </p>
          <div className="product-form-grid">
            <label>
              Tồn kho
              <input
                type="number"
                min={0}
                value={form.stockQty}
                onChange={(e) => setForm((f) => ({ ...f, stockQty: e.target.value }))}
              />
            </label>
          </div>
        </div>

        <div className="product-form-section">
          <h2>Quản lý theo đơn vị tính</h2>
          <div className="product-form-grid">
            <label>
              Đơn vị cơ bản
              <input
                value={form.baseUnit}
                onChange={(e) => setForm((f) => ({ ...f, baseUnit: e.target.value }))}
                placeholder="Gói, Cái, Chai…"
              />
            </label>
            <label>
              Giá bán cơ bản
              <input value={formatMoneyInput(form.sellPrice)} disabled readOnly />
            </label>
          </div>

          <div className="product-unit-list">
            {form.extras.map((u, idx) => (
              <div key={u.key} className="product-unit-row">
                <label>
                  Tên đơn vị
                  <input
                    value={u.name}
                    placeholder="Thùng, Lốc…"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extras: f.extras.map((x, i) =>
                          i === idx ? { ...x, name: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  = số {form.baseUnit || 'đv cơ bản'}
                  <input
                    type="number"
                    min={2}
                    value={u.factor}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extras: f.extras.map((x, i) =>
                          i === idx ? { ...x, factor: e.target.value } : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  Giá bán
                  <input
                    value={formatMoneyInput(u.sellPrice)}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extras: f.extras.map((x, i) =>
                          i === idx
                            ? { ...x, sellPrice: parseMoneyInput(e.target.value) }
                            : x,
                        ),
                      }))
                    }
                  />
                </label>
                <label>
                  Giá vốn
                  <input
                    value={formatMoneyInput(u.costPrice)}
                    placeholder="Tự = vốn × hệ số"
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        extras: f.extras.map((x, i) =>
                          i === idx
                            ? { ...x, costPrice: parseMoneyInput(e.target.value) }
                            : x,
                        ),
                      }))
                    }
                  />
                </label>
                <button
                  type="button"
                  className="ghost ghost-danger product-unit-remove"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      extras: f.extras.filter((_, i) => i !== idx),
                    }))
                  }
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ghost product-unit-add"
            onClick={() => setForm((f) => ({ ...f, extras: [...f.extras, emptyExtra()] }))}
          >
            + Thêm đơn vị
          </button>
        </div>

        {isEdit && (
          <label className="inventory-toggle product-active-toggle">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
            />
            <span>Đang kinh doanh / bán trực tiếp</span>
          </label>
        )}

        <div className="form-actions product-form-actions">
          <div className="product-form-actions-right">
            <Link className="ghost btn-lg" to="/products">
              Bỏ qua
            </Link>
            <button type="submit" className="btn-lg" disabled={busy}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </button>
          </div>
        </div>
      </form>
    </section>
  )
}
