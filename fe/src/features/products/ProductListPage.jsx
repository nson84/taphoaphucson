import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChevronDown, FileUp, Pencil, Plus, Search, Sparkles, Trash2 } from 'lucide-react'
import { api, apiUpload } from '../../shared/api'
import { formatDateTime, formatMoney } from '../../shared/format'
import ConfirmDialog from '../../shared/ConfirmDialog'
import Pagination from '../../shared/Pagination'
import ProductThumb from '../../shared/ProductThumb'
import { useToast } from '../../shared/ToastContext'
import { usePosBarcodeWedge } from '../pos/usePosBarcodeWedge'

/** Chia tên hàng tối đa 8 từ / dòng để dễ đọc trong bảng. */
function wrapName(name, wordsPerLine = 8) {
  const cleaned = String(name || '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .trim()
  const words = cleaned.split(/\s+/).filter(Boolean)
  if (words.length <= wordsPerLine) return cleaned
  const lines = []
  for (let i = 0; i < words.length; i += wordsPerLine) {
    lines.push(words.slice(i, i + wordsPerLine).join(' '))
  }
  return lines.join('\n')
}

function formatNormalizeToast(res, samples) {
  const nc = Number(res.nameChanged) || 0
  const cc = Number(res.categoryChanged) || 0
  if (nc === 0 && cc === 0) {
    return 'Không có hàng thay đổi — dữ liệu đã khớp quy tắc chuẩn hóa.'
  }
  const parts = []
  if (nc > 0) parts.push(`rút gọn ${nc} tên`)
  if (cc > 0) parts.push(`sửa nhóm ${cc} hàng`)
  let msg = `Đã ${parts.join(', ')}.`
  const ex = (samples || []).find(
    (s) => s.oldName !== s.newName || (s.oldCategory || '') !== (s.newCategory || ''),
  )
  if (ex) {
    if (ex.oldName !== ex.newName) {
      msg += ` Ví dụ tên: «${ex.oldName}» → «${ex.newName}».`
    }
    if ((ex.oldCategory || '') !== (ex.newCategory || '')) {
      msg += ` Nhóm: ${ex.oldCategory || '—'} → ${ex.newCategory || '—'}.`
    }
  }
  return msg
}

function isProductNotFoundError(err) {
  return /không tìm thấy/i.test(String(err?.message || ''))
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

function NormalizePreviewBody({ preview }) {
  if (!preview) return null
  const total = preview.total || 0
  const nc = preview.nameChanged || 0
  const cc = preview.categoryChanged || 0
  const nothing = nc === 0 && cc === 0
  const samples = preview.samples || []

  return (
    <div className="normalize-preview-body">
      {nothing ? (
        <p className="muted">
          Đã kiểm tra <strong>{total}</strong> hàng: tên và nhóm <strong>đã đúng</strong> theo quy tắc
          chuẩn hóa — <strong>không có gì để sửa</strong>. Chỉ bấm <strong>Đóng</strong> (không cần PIN).
        </p>
      ) : (
        <p className="muted">
          Trong <strong>{total}</strong> hàng: rút gọn <strong>{nc}</strong> tên (bỏ tem phụ, date, ghi
          chú thừa; giữ khối lượng), sửa nhóm <strong>{cc}</strong> hàng theo từ khóa trong tên. Hàng
          không nhận ra → nhóm &quot;Khác&quot;. <strong>Không hoàn tác.</strong>
        </p>
      )}
      {samples.length > 0 && (
        <div className="normalize-samples-wrap">
          <p className="normalize-samples-title">Ví dụ sẽ đổi (một phần):</p>
          <table className="normalize-samples">
            <thead>
              <tr>
                <th>Trước</th>
                <th>Sau</th>
              </tr>
            </thead>
            <tbody>
              {samples.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className="normalize-cell-name">{s.oldName}</div>
                    <div className="normalize-cell-cat muted">{s.oldCategory || '—'}</div>
                  </td>
                  <td>
                    <div className="normalize-cell-name">{s.newName}</div>
                    <div className="normalize-cell-cat muted">{s.newCategory || '—'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function ProductListPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const searchWrapRef = useRef(null)
  const searchRef = useRef(null)
  /** Phím máy quét (cách nhau rất ngắn) — mở sửa hàng, không xổ gợi ý. */
  const scanBurstRef = useRef(false)
  const lastSearchKeyAtRef = useRef(0)
  const scanInflightRef = useRef('')
  const openScanRef = useRef(null)
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0, totalElements: 0 })
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [codeType, setCodeType] = useState('all')
  const [stats, setStats] = useState(null)
  const [confirmDeleteFake, setConfirmDeleteFake] = useState(false)
  const [deletingFake, setDeletingFake] = useState(false)
  const [stockThreshold, setStockThreshold] = useState(10)

  const [normalizePreview, setNormalizePreview] = useState(null)
  const [normalizing, setNormalizing] = useState(false)
  const [codeFilterOpen, setCodeFilterOpen] = useState(false)
  const codeFilterRef = useRef(null)

  const [suggestions, setSuggestions] = useState([])
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [showSuggest, setShowSuggest] = useState(false)

  const codeFilterLabels = {
    all: `Tất cả mã${stats ? ` (${stats.total})` : ''}`,
    fake: `Mã ảo / nội bộ${stats ? ` (${stats.fake})` : ''}`,
    real: `Mã vạch thật${stats ? ` (${stats.real})` : ''}`,
    nobarcode: `Không có mã vạch${stats ? ` (${stats.nobarcode ?? 0})` : ''}`,
    barcodeName: `Tên hàng dạng mã vạch${stats ? ` (${stats.barcodeName ?? 0})` : ''}`,
    noCost: 'Chưa có giá vốn',
  }

  const codeFilterOptions = ['all', 'fake', 'real', 'nobarcode', 'barcodeName', 'noCost']

  useEffect(() => {
    function onDocClick(e) {
      if (codeFilterRef.current && !codeFilterRef.current.contains(e.target)) {
        setCodeFilterOpen(false)
      }
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (scanBurstRef.current) {
      setSuggestions([])
      setSuggestLoading(false)
      setShowSuggest(false)
      return undefined
    }
    if (!term) {
      setSuggestions([])
      setSuggestLoading(false)
      setShowSuggest(false)
      return undefined
    }
    let cancelled = false
    setSuggestLoading(true)
    const t = setTimeout(() => {
      api(`/api/products?q=${encodeURIComponent(term)}&page=0&size=8`)
        .then((res) => {
          if (cancelled) return
          setSuggestions(res.content || [])
          setShowSuggest(true)
        })
        .catch(() => {
          if (cancelled) return
          setSuggestions([])
          setShowSuggest(true)
        })
        .finally(() => {
          if (!cancelled) setSuggestLoading(false)
        })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

  function pickCodeFilter(value) {
    setCodeType(value)
    setPage(0)
    setCodeFilterOpen(false)
  }

  async function openProductByScan(rawCode) {
    const code = String(rawCode || '').trim()
    if (!code || scanInflightRef.current === code) return
    scanInflightRef.current = code
    scanBurstRef.current = true
    setShowSuggest(false)
    setSuggestions([])
    setSuggestLoading(false)
    setQ(code)
    try {
      const product = await fetchProductByBarcode(code)
      if (!product?.id) {
        toast.error(`Không tìm thấy hàng với mã ${code}`)
        scanBurstRef.current = false
        return
      }
      navigate(`/products/${product.id}/edit`)
    } catch (err) {
      scanBurstRef.current = false
      if (isProductNotFoundError(err)) {
        toast.error(`Không tìm thấy hàng với mã ${code}`)
        setQ(code)
        setQuery(code)
        setPage(0)
        return
      }
      toast.error(err.message || 'Không tìm thấy hàng')
    } finally {
      if (scanInflightRef.current === code) scanInflightRef.current = ''
    }
  }

  openScanRef.current = openProductByScan

  /** Ô tìm đang focus: máy quét đủ mã số thì mở sửa, không chờ bấm gợi ý. */
  useEffect(() => {
    const term = q.trim()
    if (!scanBurstRef.current) return undefined
    if (!/^[0-9]{8}$|^[0-9]{12,14}$/.test(term)) return undefined
    const t = window.setTimeout(() => {
      if (!scanBurstRef.current) return
      void openScanRef.current?.(term)
    }, 180)
    return () => window.clearTimeout(t)
  }, [q])

  usePosBarcodeWedge({
    searchRef,
    onEnter: (code) => openScanRef.current?.(code),
    onInput: (partial) => {
      scanBurstRef.current = true
      setQ(partial)
      setSuggestions([])
      setSuggestLoading(false)
      setShowSuggest(false)
    },
  })

  function pickSuggestion(product) {
    setShowSuggest(false)
    setQ(product.name || product.barcode || '')
    setQuery(product.name || product.barcode || '')
    setPage(0)
    navigate(`/products/${product.id}/edit`)
  }

  function suggestCodeLine(p) {
    return p.barcode || p.sku || '—'
  }

  async function openNormalize() {
    try {
      setNormalizePreview(await api('/api/products/normalize/preview?limit=8'))
    } catch (err) {
      toast.error(err.message)
    }
  }

  async function applyNormalize(pin) {
    const preview = normalizePreview
    const nc = preview?.nameChanged || 0
    const cc = preview?.categoryChanged || 0
    if (nc === 0 && cc === 0) {
      setNormalizePreview(null)
      return
    }
    setNormalizing(true)
    try {
      const res = await api('/api/products/normalize/apply', {
        method: 'POST',
        body: JSON.stringify({ pin }),
        inlineForbidden: true,
      })
      toast.success(formatNormalizeToast(res, preview?.samples))
      setNormalizePreview(null)
      setPage(0)
      setReloadKey((k) => k + 1)
    } finally {
      setNormalizing(false)
    }
  }

  async function deleteFakeCodes(pin) {
    setDeletingFake(true)
    try {
      const res = await api('/api/products/fake-codes/delete', {
        method: 'POST',
        body: JSON.stringify({ pin }),
        inlineForbidden: true,
      })
      const parts = [`xóa hẳn ${res.deleted} hàng mã ảo khỏi DB`]
      if (res.stripped) parts.push(`bỏ mã nội bộ khỏi ${res.stripped} hàng`)
      toast.success(`Đã ${parts.join(', ')}`)
      setConfirmDeleteFake(false)
      setPage(0)
      setReloadKey((k) => k + 1)
    } finally {
      setDeletingFake(false)
    }
  }

  useEffect(() => {
    api('/api/products/code-stats')
      .then(setStats)
      .catch(() => setStats(null))
    api('/api/settings/inventory')
      .then((d) => setStockThreshold(Number(d.threshold) || 10))
      .catch(() => setStockThreshold(10))
  }, [reloadKey])

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    const codeTypeParam =
      codeType === 'noCost' ? 'nocost' : codeType === 'barcodeName' ? 'barname' : codeType
    api(
      `/api/products?q=${encodeURIComponent(query)}&codeType=${encodeURIComponent(codeTypeParam)}&page=${page}&size=20`,
    )
      .then(setData)
      .catch((e) => setError(e.message))
  }, [query, page, codeType, reloadKey])

  async function onImportFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setImporting(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await apiUpload('/api/products/import', fd)
      toast.success(
        `Nhập xong: tạo ${res.created}, cập nhật ${res.updated}, bỏ qua ${res.skipped}, mã quét ${res.barcodes}`,
      )
      if (res.errors?.length) {
        setError(res.errors.slice(0, 8).join('\n'))
      }
      setReloadKey((k) => k + 1)
    } catch (err) {
      setError(err.message || 'Nhập Excel thất bại')
    } finally {
      setImporting(false)
    }
  }

  return (
    <section className="panel product-list-page">
      <div className="panel-head summary-page-head product-list-page-head">
        <div>
          <h1 className="summary-page-title">Hàng hóa</h1>
        </div>
      </div>
      <div className="product-list-toolbar">
        <div className="product-list-search-wrap" ref={searchWrapRef}>
          <Search size={18} strokeWidth={2.25} aria-hidden className="product-list-search-icon" />
          <input
            ref={searchRef}
            className="search product-list-search"
            type="search"
            placeholder="Theo mã, tên hàng"
            value={q}
            onChange={(e) => {
              const v = e.target.value
              const now = Date.now()
              const gap = lastSearchKeyAtRef.current ? now - lastSearchKeyAtRef.current : 999
              lastSearchKeyAtRef.current = now
              if (v.trim() && gap < 50) scanBurstRef.current = true
              else if (gap > 80) scanBurstRef.current = false
              setQ(v)
              if (scanBurstRef.current) {
                setSuggestions([])
                setSuggestLoading(false)
                setShowSuggest(false)
              }
            }}
            onFocus={() => {
              if (scanBurstRef.current) return
              if (q.trim() && (suggestions.length > 0 || suggestLoading)) setShowSuggest(true)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setShowSuggest(false)
              if (e.key === 'Enter' && scanBurstRef.current) {
                e.preventDefault()
                const typed = e.currentTarget?.value ?? q
                void openProductByScan(typed)
                return
              }
              if (e.key === 'Enter' && suggestions.length === 1) {
                e.preventDefault()
                pickSuggestion(suggestions[0])
              }
            }}
            autoComplete="off"
            aria-label="Tìm kiếm hàng hóa"
            aria-autocomplete="list"
            aria-expanded={showSuggest}
          />
          {showSuggest && (suggestLoading || suggestions.length > 0 || q.trim()) && (
            <ul className="summary-suggest-list product-list-suggest-list" role="listbox">
              {suggestLoading && <li className="summary-suggest-empty">Đang tìm…</li>}
              {!suggestLoading && suggestions.length === 0 && (
                <li className="summary-suggest-empty">Không có gợi ý</li>
              )}
              {!suggestLoading &&
                suggestions.map((p) => (
                  <li key={p.id} role="option">
                    <button
                      type="button"
                      className="summary-suggest-item"
                      onClick={() => pickSuggestion(p)}
                    >
                      <span className="summary-suggest-name">
                        {p.name}
                        <small className="product-list-suggest-code"> · {suggestCodeLine(p)}</small>
                      </span>
                      <span className="summary-suggest-balance">{formatMoney(p.sellPrice)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
        <div className="ui-select product-code-filter-wrap" ref={codeFilterRef}>
          <button
            type="button"
            className="ui-select-trigger product-code-filter"
            aria-haspopup="listbox"
            aria-expanded={codeFilterOpen}
            onClick={() => setCodeFilterOpen((open) => !open)}
          >
            <span className="ui-select-trigger-label">{codeFilterLabels[codeType]}</span>
            <ChevronDown size={18} strokeWidth={2.25} aria-hidden className="ui-select-chevron" />
          </button>
          {codeFilterOpen && (
            <ul className="ui-select-menu" role="listbox" aria-label="Lọc loại mã">
              {codeFilterOptions.map((value) => (
                <li key={value} role="presentation">
                  <button
                    type="button"
                    role="option"
                    aria-selected={codeType === value}
                    className={`ui-select-option${codeType === value ? ' is-active' : ''}`}
                    onClick={() => pickCodeFilter(value)}
                  >
                    {codeFilterLabels[value]}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button type="button" className="btn btn-tool" onClick={openNormalize}>
          <Sparkles size={16} strokeWidth={2} aria-hidden />
          Chuẩn hóa tên &amp; nhóm
        </button>
        {(stats?.fake > 0 || stats?.internalSku > 0) && (
          <button type="button" className="btn danger" onClick={() => setConfirmDeleteFake(true)}>
            <Trash2 size={16} strokeWidth={2} aria-hidden />
            Xóa mã ảo ({stats.fake + stats.internalSku})
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          hidden
          onChange={onImportFile}
        />
        <button
          type="button"
          className="btn btn-import"
          disabled={importing}
          onClick={() => fileRef.current?.click()}
        >
          <FileUp size={16} strokeWidth={2} aria-hidden />
          {importing ? 'Đang nhập…' : 'Nhập Excel'}
        </button>
        <Link className="btn btn-create" to="/products/new">
          <Plus size={18} strokeWidth={2.25} aria-hidden />
          Tạo mới
        </Link>
      </div>
      {error && <p className="error" style={{ whiteSpace: 'pre-wrap' }}>{error}</p>}
      <div className="table-wrap accent-table-wrap product-list-table-wrap">
        <table className="product-list-table accent-data-table">
          <thead>
            <tr>
              <th className="product-col-thumb" />
              <th>Mã hàng</th>
              <th>Tên hàng</th>
              <th>Nhóm</th>
              <th>Giá bán</th>
              <th>Giá vốn</th>
              <th>Tồn kho</th>
              <th>Đơn vị</th>
              <th>Thời gian tạo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {(data.content || []).map((p) => {
              const stock = Number(p.stockQty) || 0
              const low = p.active !== false && stock > 0 && stock < stockThreshold
              return (
              <tr
                key={p.id}
                className={[!p.active ? 'row-paid' : '', low ? 'row-low-stock' : ''].filter(Boolean).join(' ')}
              >
                <td className="product-col-thumb">
                  <ProductThumb productId={p.id} hasImage={p.hasImage} alt={p.name} />
                </td>
                <td className="mono product-col-code">
                  {p.sku || p.barcode}
                  {p.barcode && p.barcode !== p.sku ? <div className="muted">{p.barcode}</div> : null}
                  {p.hasPhysicalBarcode === false && (
                    <span className="code-badge code-badge-nobarcode">Không mã vạch</span>
                  )}
                  {!p.realBarcode && <span className="code-badge code-badge-fake">Mã ảo</span>}
                </td>
                <td className="product-name-cell product-col-name">
                  <span className="product-name-text">{wrapName(p.name)}</span>
                  {!p.active ? ' (ngừng)' : ''}
                </td>
                <td className="product-col-cat">{p.category || '—'}</td>
                <td className="product-col-money">{formatMoney(p.sellPrice)}</td>
                <td className="product-col-money">{formatMoney(p.costPrice)}</td>
                <td className={`product-col-stock${low ? ' stock-low' : ''}`}>{stock}</td>
                <td className="product-col-unit">
                  {p.unit || '—'}
                  {(p.units || []).length > 1 ? (
                    <span className="muted"> +{(p.units || []).length - 1}</span>
                  ) : null}
                </td>
                <td className="product-col-time">{formatDateTime(p.createdAt)}</td>
                <td className="product-col-action">
                  <Link className="btn product-edit-btn" to={`/products/${p.id}/edit`}>
                    <Pencil size={15} strokeWidth={2} aria-hidden />
                    Sửa
                  </Link>
                </td>
              </tr>
              )
            })}
            {(!data.content || data.content.length === 0) && (
              <tr>
                <td colSpan={9}>Chưa có hàng hóa</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages || 0} onChange={setPage} />
      <ConfirmDialog
        open={confirmDeleteFake}
        title="Xóa mã ảo?"
        message={`Xóa hẳn ${stats?.fake || 0} hàng chỉ có mã nội bộ (SP…, QM…) hoặc mã vạch sai khỏi DB; bỏ mã nội bộ khỏi ${stats?.internalSku || 0} hàng có mã vạch thật (hàng vẫn giữ). Hóa đơn cũ vẫn giữ tên/mã đã bán. Không hoàn tác được.`}
        confirmLabel="Xóa"
        requirePin
        danger
        busy={deletingFake}
        onClose={() => setConfirmDeleteFake(false)}
        onConfirm={deleteFakeCodes}
      />
      <ConfirmDialog
        open={normalizePreview != null}
        title="Chuẩn hóa tên & nhóm hàng?"
        cardClassName="modal-card--normalize"
        confirmLabel="Chuẩn hóa"
        requirePin={
          (normalizePreview?.nameChanged || 0) > 0 || (normalizePreview?.categoryChanged || 0) > 0
        }
        hideConfirm={
          (normalizePreview?.nameChanged || 0) === 0 && (normalizePreview?.categoryChanged || 0) === 0
        }
        busy={normalizing}
        onClose={() => setNormalizePreview(null)}
        onConfirm={applyNormalize}
      >
        <NormalizePreviewBody preview={normalizePreview} />
      </ConfirmDialog>

    </section>
  )
}
