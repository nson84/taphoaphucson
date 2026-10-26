import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api } from '../../shared/api'
import {
  AMOUNT_SORT_DESC,
  amountSortLabel,
  toggleAmountSort,
} from '../../shared/amountSort'
import { formatCustomerDisplayName } from '../../shared/customerName'
import { formatMoney, formatMoneyInput, parseMoneyInput } from '../../shared/format'
import { validatePayAmount } from '../../shared/moneyValidation'
import { printReceipt } from '../../shared/print'
import ConfirmDialog from '../../shared/ConfirmDialog'
import DateTimeCell from '../../shared/DateTimeCell'
import ExpandableTextCell from '../../shared/ExpandableTextCell'
import Pagination from '../../shared/Pagination'
import WaitingPaymentDialog from '../../shared/WaitingPaymentDialog'

/** Phân bổ số tiền trả vào các khoản còn nợ nhỏ nhất trước. */
function allocatePayAmount(unpaidDebts, amount) {
  let remaining = amount
  const lines = []
  const sorted = [...unpaidDebts].sort((a, b) => {
    const da = Number(a.amount) - Number(b.amount)
    if (da !== 0) return da
    return Number(a.id) - Number(b.id)
  })
  for (const d of sorted) {
    if (remaining <= 0) break
    const debtAmt = Number(d.amount) || 0
    if (debtAmt <= 0) continue
    const apply = Math.min(remaining, debtAmt)
    lines.push({ ...d, applyAmount: apply })
    remaining -= apply
  }
  return lines
}

export default function CustomerDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [customer, setCustomer] = useState(null)
  const [payAmountDraft, setPayAmountDraft] = useState('')
  const [page, setPage] = useState(0)
  const [amountSort, setAmountSort] = useState(AMOUNT_SORT_DESC)
  const [debts, setDebts] = useState({ content: [], totalPages: 0 })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [checkout, setCheckout] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [printPreview, setPrintPreview] = useState(null)
  const [trashDraft, setTrashDraft] = useState('')
  const [trashSuggestions, setTrashSuggestions] = useState([])
  const [showTrashSuggest, setShowTrashSuggest] = useState(false)
  const [trashSuggestLoading, setTrashSuggestLoading] = useState(false)
  const trashSearchRef = useRef(null)
  const trashSuggestSeq = useRef(0)

  const inTrash = Boolean(customer?.trashed) || searchParams.get('from') === 'trash'

  const unpaidIds = useMemo(
    () => debts.content.filter((d) => !d.paid).map((d) => d.id),
    [debts.content],
  )
  const allUnpaidSelected = unpaidIds.length > 0 && unpaidIds.every((uid) => selected.has(uid))
  const selectedCount = [...selected].filter((uid) => unpaidIds.includes(uid)).length

  async function loadCustomer() {
    const c = await api(`/api/customers/${id}`)
    setCustomer(c)
  }

  async function loadDebts(pageIndex = page, sort = amountSort) {
    const params = new URLSearchParams({
      page: String(pageIndex),
      size: '20',
      sort,
    })
    const res = await api(`/api/customers/${id}/debts?${params}`)
    setDebts(res)
    setSelected(new Set())
    setError('')
  }

  useEffect(() => {
    loadCustomer().catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    loadDebts(page, amountSort).catch((e) => setError(e.message))
  }, [id, page, amountSort])

  useEffect(() => {
    if (!inTrash) {
      setTrashSuggestions([])
      setShowTrashSuggest(false)
      return
    }
    const q = trashDraft.trim()
    if (q.length < 1) {
      setTrashSuggestions([])
      setShowTrashSuggest(false)
      setTrashSuggestLoading(false)
      return
    }
    const seq = ++trashSuggestSeq.current
    setTrashSuggestLoading(true)
    const t = setTimeout(() => {
      api(`/api/trash?q=${encodeURIComponent(q)}&page=0&size=8&sort=${encodeURIComponent(AMOUNT_SORT_DESC)}`)
        .then((res) => {
          if (seq !== trashSuggestSeq.current) return
          setTrashSuggestions(res.customers || [])
          setShowTrashSuggest(true)
        })
        .catch(() => {
          if (seq !== trashSuggestSeq.current) return
          setTrashSuggestions([])
        })
        .finally(() => {
          if (seq === trashSuggestSeq.current) setTrashSuggestLoading(false)
        })
    }, 200)
    return () => clearTimeout(t)
  }, [trashDraft, inTrash])

  useEffect(() => {
    function onDocClick(e) {
      if (trashSearchRef.current && !trashSearchRef.current.contains(e.target)) {
        setShowTrashSuggest(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function toggleOne(debtId) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(debtId)) next.delete(debtId)
      else next.add(debtId)
      return next
    })
  }

  function toggleAll() {
    if (allUnpaidSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(unpaidIds))
  }

  function openCheckout(items, mode = 'batch', amount = null) {
    const list = (items || []).filter((d) => d && !d.paid)
    if (list.length === 0) return
    setCheckout({ items: list, mode, amount })
  }

  async function completeCheckout() {
    if (!checkout) return
    setBatchBusy(true)
    try {
      if (checkout.mode === 'amount') {
        await api(`/api/customers/${id}/pay-amount`, {
          method: 'POST',
          body: JSON.stringify({ amount: checkout.amount }),
        })
        setPayAmountDraft('')
      } else {
        await api('/api/debts/pay-batch', {
          method: 'POST',
          body: JSON.stringify({ ids: checkout.items.map((d) => d.id) }),
        })
      }
      setCheckout(null)
      await Promise.all([loadCustomer(), loadDebts()])
    } finally {
      setBatchBusy(false)
    }
  }

  async function openAmountCheckout() {
    const balance = Number(customer?.balance) || 0
    const money = validatePayAmount(payAmountDraft, { maxBalance: balance })
    if (!money.ok) {
      setError(
        money.exceedBalance
          ? `Số tiền không được lớn hơn tổng còn nợ ${formatMoney(balance)}`
          : money.message,
      )
      return
    }
    const amount = money.amount
    setError('')
    setBatchBusy(true)
    try {
      const all = await fetchAllDebts()
      const unpaid = all.filter((d) => !d.paid)
      if (unpaid.length === 0) {
        setError('Không còn khoản nợ để trả')
        return
      }
      const lines = allocatePayAmount(unpaid, amount)
      if (lines.length === 0) {
        setError('Không phân bổ được số tiền vào khoản nợ')
        return
      }
      openCheckout(lines, 'amount', amount)
    } catch (e) {
      setError(e.message || 'Không tải được khoản nợ')
    } finally {
      setBatchBusy(false)
    }
  }

  async function doCancelPay(debtId, pin) {
    setBusyId(debtId)
    try {
      await api(`/api/debts/${debtId}/unpay`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      setConfirm(null)
      await Promise.all([loadCustomer(), loadDebts()])
    } finally {
      setBusyId(null)
    }
  }

  async function fetchAllDebts() {
    const size = 200
    const items = []
    let pageIndex = 0
    let totalPages = 1
    do {
      const params = new URLSearchParams({
        page: String(pageIndex),
        size: String(size),
      })
      const res = await api(`/api/customers/${id}/debts?${params}`)
      items.push(...(res.content || []))
      totalPages = Number(res.totalPages) || 0
      pageIndex += 1
    } while (pageIndex < totalPages && pageIndex < 100)
    return items
  }

  async function openPrintPreview() {
    setPreviewLoading(true)
    setError('')
    try {
      const items = await fetchAllDebts()
      if (inTrash) {
        const paidItems = items.filter((d) => d.paid)
        if (paidItems.length === 0) {
          setError('Không có khoản đã thanh toán để in')
          return
        }
        setPrintPreview({
          items: paidItems,
          printedAt: new Date(),
          qr: null,
          qrNotice: '',
          paidReceipt: true,
        })
        return
      }
      const unpaidItems = items.filter((d) => !d.paid)
      if (unpaidItems.length === 0) {
        setError('Không có khoản còn nợ để in')
        return
      }
      const total = unpaidItems.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)
      let qr = null
      let qrNotice = ''
      try {
        qr = await api(`/api/customers/${id}/debt-qr`, {
          method: 'POST',
          body: JSON.stringify({ amount: Math.round(total) }),
        })
      } catch (qrErr) {
        qrNotice =
          qrErr.message ||
          'Chưa có QR — vào Cài đặt, bật QR và điền số tài khoản / tên chủ TK.'
      }
      setPrintPreview({
        items: unpaidItems,
        printedAt: new Date(),
        qr,
        qrNotice,
        paidReceipt: false,
      })
    } catch (e) {
      setError(e.message || 'Không tải được danh sách để in')
    } finally {
      setPreviewLoading(false)
    }
  }

  function closePrintPreview() {
    document.body.classList.remove('print-debts')
    setPrintPreview(null)
  }

  async function confirmPrint() {
    document.body.classList.add('print-debts')
    // Đợi CSS print áp dụng trước khi gửi máy in
    await new Promise((r) => window.setTimeout(r, 80))
    try {
      const result = await printReceipt()
      if (result.silent) {
        closePrintPreview()
      }
      // Trình duyệt: đóng form sau khi hộp thoại in đóng (afterprint)
    } catch (e) {
      setError(e.message || 'In thất bại')
      document.body.classList.remove('print-debts')
    }
  }

  useEffect(() => {
    function onAfterPrint() {
      closePrintPreview()
    }
    window.addEventListener('afterprint', onAfterPrint)
    return () => {
      window.removeEventListener('afterprint', onAfterPrint)
      document.body.classList.remove('print-debts')
    }
  }, [])

  if (!customer) {
    return <section className="panel">{error || 'Đang tải...'}</section>
  }

  function pickTrashSuggestion(c) {
    setTrashDraft(c.name)
    setShowTrashSuggest(false)
    navigate(`/customers/${c.id}?from=trash`)
  }

  function applyTrashSearch(e) {
    e?.preventDefault()
    const q = trashDraft.trim()
    if (!q) return
    setShowTrashSuggest(false)
    api(`/api/trash?q=${encodeURIComponent(q)}&page=0&size=1&sort=${encodeURIComponent(AMOUNT_SORT_DESC)}`)
      .then((res) => {
        const first = res.customers?.[0]
        if (first) navigate(`/customers/${first.id}?from=trash`)
        else setError('Không tìm thấy khách trong thùng rác')
      })
      .catch((err) => setError(err.message))
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <Link className="form-back" to={inTrash ? '/trash' : '/'}>
            {inTrash ? '← Quay lại thùng rác' : '← Quay lại tổng hợp'}
          </Link>
          <h1>{formatCustomerDisplayName(customer.name, customer.parentName, customer.company)}</h1>
          <p className="customer-balance-line">
            {inTrash ? 'Tổng đã trả: ' : 'Tổng còn nợ: '}
            <strong className={inTrash || Number(customer.balance) <= 0 ? 'balance-paid' : 'balance-unpaid'}>
              {formatMoney(customer.balance)}
            </strong>
          </p>
        </div>
        <div className="panel-actions">
          <button
            type="button"
            className="ghost"
            disabled={previewLoading || (debts.totalElements ?? debts.content.length) === 0}
            onClick={openPrintPreview}
          >
            {previewLoading ? 'Đang tải…' : 'In danh sách'}
          </button>
          {!inTrash && (
            <>
              <button
                type="button"
                disabled={selectedCount === 0 || batchBusy}
                onClick={() =>
                  openCheckout(debts.content.filter((d) => !d.paid && selected.has(d.id)))
                }
              >
                Trả nợ đã chọn ({selectedCount})
              </button>
              <Link className="btn" to="/debts/new">
                + Thêm nợ
              </Link>
            </>
          )}
        </div>
      </div>

      {inTrash ? (
        <form className="summary-search" onSubmit={applyTrashSearch} ref={trashSearchRef}>
          <div className="summary-search-row">
            <div className="summary-search-input-wrap">
              <input
                type="search"
                className="summary-search-input"
                placeholder="Tìm tên khách trong thùng rác..."
                value={trashDraft}
                onChange={(e) => setTrashDraft(e.target.value)}
                onFocus={() => {
                  if (trashSuggestions.length > 0) setShowTrashSuggest(true)
                }}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={showTrashSuggest}
              />
              {showTrashSuggest && (trashSuggestLoading || trashSuggestions.length > 0 || trashDraft.trim()) && (
                <ul className="summary-suggest-list" role="listbox">
                  {trashSuggestLoading && <li className="summary-suggest-empty">Đang tìm…</li>}
                  {!trashSuggestLoading && trashSuggestions.length === 0 && (
                    <li className="summary-suggest-empty">Không có gợi ý</li>
                  )}
                  {!trashSuggestLoading &&
                    trashSuggestions.map((c) => (
                      <li key={c.id} role="option">
                        <button
                          type="button"
                          className="summary-suggest-item"
                          onClick={() => pickTrashSuggestion(c)}
                        >
                          <span className="summary-suggest-name">
                            {formatCustomerDisplayName(c.name, c.parentName, c.company)}
                          </span>
                          <span className="summary-suggest-balance balance-paid">
                            {formatMoney(c.balance)}
                          </span>
                        </button>
                      </li>
                    ))}
                </ul>
              )}
            </div>
            <button type="submit">Tìm kiếm</button>
            <button
              type="button"
              className="btn-cancel"
              onClick={() => {
                setTrashDraft('')
                setTrashSuggestions([])
                setShowTrashSuggest(false)
                setError('')
              }}
            >
              Xóa
            </button>
            <button
              type="button"
              className="ghost amount-sort-btn"
              onClick={() => {
                setPage(0)
                setAmountSort((s) => toggleAmountSort(s))
              }}
              title="Đảo chiều sắp xếp theo số tiền"
            >
              {amountSortLabel(amountSort)}
            </button>
          </div>
        </form>
      ) : (
        <div className="filters pay-amount-bar">
          <label className="filter-amount-field">
            Số tiền khách muốn trả
            <input
              type="text"
              inputMode="numeric"
              className="datepicker-input"
              value={formatMoneyInput(payAmountDraft)}
            onChange={(e) => setPayAmountDraft(parseMoneyInput(e.target.value).slice(0, 12))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                openAmountCheckout()
              }
            }}
            placeholder="Vd: 17.000"
            aria-label="Số tiền khách muốn trả"
          />
        </label>
        <button type="button" className="btn-pay" disabled={batchBusy} onClick={openAmountCheckout}>
          {batchBusy ? 'Đang xử lý…' : 'Trả theo số tiền'}
        </button>
          <button
            type="button"
            className="ghost amount-sort-btn"
            onClick={() => {
              setPage(0)
              setAmountSort((s) => toggleAmountSort(s))
            }}
            title="Đảo chiều sắp xếp theo số tiền"
          >
            {amountSortLabel(amountSort)}
          </button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {!inTrash && (
                <th className="col-check">
                  <input
                    type="checkbox"
                    checked={allUnpaidSelected}
                    disabled={unpaidIds.length === 0}
                    onChange={toggleAll}
                    title="Chọn tất cả còn nợ trên trang"
                    aria-label="Chọn tất cả còn nợ trên trang"
                  />
                </th>
              )}
              <th>Loại</th>
              <th>Ngày giờ</th>
              <th>Người lấy</th>
              <th>Số tiền</th>
              <th>Sản phẩm</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {debts.content.map((d) => (
              <tr key={d.id} className={d.paid ? 'row-paid' : 'row-unpaid'}>
                {!inTrash && (
                  <td className="col-check">
                    {!d.paid && (
                      <input
                        type="checkbox"
                        checked={selected.has(d.id)}
                        onChange={() => toggleOne(d.id)}
                        aria-label={`Chọn khoản nợ ${d.id}`}
                      />
                    )}
                  </td>
                )}
                <td>
                  <span className={`debt-type-badge ${d.debtType === 'COMPANY' ? 'type-company' : 'type-personal'}`}>
                    {d.debtType === 'COMPANY' ? 'Công ty' : 'Cá nhân'}
                  </span>
                </td>
                <td>
                  <DateTimeCell value={d.occurredAt} />
                </td>
                <td>
                  <ExpandableTextCell value={d.pickerName} title="Chi tiết người lấy" />
                </td>
                <td>{formatMoney(d.amount)}</td>
                <td>
                  <ExpandableTextCell value={d.productNote} title="Chi tiết sản phẩm" />
                </td>
                <td>
                  <span className={`status-badge ${d.paid ? 'status-paid' : 'status-unpaid'}`}>
                    {d.paid ? 'Hết nợ' : 'Còn nợ'}
                  </span>
                </td>
                <td className="row-actions">
                  {d.paid ? (
                    <button
                      type="button"
                      className="btn-cancel"
                      disabled={busyId === d.id}
                      onClick={() =>
                        setConfirm({
                          type: 'cancel',
                          id: d.id,
                          title: 'Xác nhận hủy trả nợ',
                          message: 'Nhập mã PIN để kích hoạt lại khoản nợ này.',
                          confirmLabel: 'Hủy trả nợ',
                          requirePin: true,
                          danger: true,
                        })
                      }
                    >
                      Hủy
                    </button>
                  ) : inTrash ? (
                    <span className="muted">—</span>
                  ) : (
                    <>
                      <Link className="btn btn-edit" to={`/debts/${d.id}/edit`}>
                        Sửa
                      </Link>
                      <button
                        type="button"
                        className="btn-pay"
                        disabled={batchBusy}
                        onClick={() => openCheckout([d])}
                      >
                        Trả nợ
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {debts.content.length === 0 && (
              <tr>
                <td colSpan={inTrash ? 7 : 8}>Không có khoản nợ trong khoảng đã chọn</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={debts.totalPages} onChange={setPage} />

      <WaitingPaymentDialog
        open={Boolean(checkout)}
        customerId={id}
        items={checkout?.items || []}
        payAmount={checkout?.mode === 'amount' ? checkout.amount : null}
        busy={batchBusy}
        onClose={() => setCheckout(null)}
        onComplete={completeCheckout}
        onPrintInvoice={({ items: payItems, qr, qrNotice }) => {
          setPrintPreview({
            items: payItems.map((d) =>
              d.applyAmount != null ? { ...d, amount: d.applyAmount } : d,
            ),
            printedAt: new Date(),
            qr: qr || null,
            qrNotice: qrNotice || '',
            autoPrint: true,
          })
        }}
      />

      {printPreview && (
        <DebtPrintPreview
          customerName={formatCustomerDisplayName(customer.name, customer.parentName, customer.company)}
          printedAt={printPreview.printedAt}
          items={printPreview.items}
          qr={printPreview.qr}
          qrNotice={printPreview.qrNotice}
          paidReceipt={Boolean(printPreview.paidReceipt)}
          autoPrint={Boolean(printPreview.autoPrint)}
          onClose={closePrintPreview}
          onPrint={confirmPrint}
        />
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        requirePin={Boolean(confirm?.requirePin)}
        danger={Boolean(confirm?.danger)}
        busy={busyId != null || batchBusy}
        onClose={() => setConfirm(null)}
        onConfirm={async (pin) => {
          if (confirm?.type === 'cancel') await doCancelPay(confirm.id, pin)
        }}
      />
    </section>
  )
}

const STORE = {
  name: 'TẠP HÓA PHÚC SƠN',
  address: 'Địa chỉ: Xóm 14 - Hải Hưng - Ninh Bình',
  phone: 'Điện thoại: 0969 774 260',
}

function formatReceiptMoney(value) {
  const n = Number(value)
  if (value == null || Number.isNaN(n)) return '0'
  return Math.round(n).toLocaleString('vi-VN')
}

function formatReceiptDate(date) {
  const d = date instanceof Date ? date : new Date(date)
  return `Ngày ${d.getDate()} tháng ${d.getMonth() + 1} năm ${d.getFullYear()}`
}

function formatReceiptDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  // Gọn cho giấy in hẹp: 25/10 16:49
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function sumAmounts(items) {
  return items.reduce((sum, debt) => {
    const amount = Number(debt.amount)
    return sum + (Number.isFinite(amount) ? amount : 0)
  }, 0)
}

function DebtReceipt({ customerName, printedAt, items, qr, paidReceipt = false }) {
  const total = sumAmounts(items)

  return (
    <div className="receipt">
      <div className="receipt-head">
        <p className="receipt-store">{STORE.name}</p>
        <p>{STORE.address}</p>
        <p>{STORE.phone}</p>
        <p className="receipt-title">BẢNG KÊ CÔNG NỢ</p>
        {paidReceipt && <p className="receipt-paid-stamp">ĐÃ THANH TOÁN THÀNH CÔNG</p>}
        <p>{formatReceiptDate(printedAt)}</p>
        <p>
          Khách hàng: <strong>{customerName}</strong>
        </p>
      </div>
      <table className="receipt-table">
        <thead>
          <tr>
            <th className="col-when">Ngày</th>
            <th className="col-picker">Lấy</th>
            <th className="col-product">SP</th>
            <th className="col-price">Giá</th>
          </tr>
        </thead>
        <tbody>
          {items.map((debt) => (
            <tr key={debt.id}>
              <td className="col-when">{formatReceiptDateTime(debt.occurredAt)}</td>
              <td className="col-picker">{debt.pickerName || '—'}</td>
              <td className="col-product">{debt.productNote || '—'}</td>
              <td className="col-price">{formatReceiptMoney(debt.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="receipt-summary">
        <div className="receipt-summary-row receipt-summary-total">
          <span>{paidReceipt ? 'Tổng đã thanh toán:' : 'Tổng còn nợ:'}</span>
          <span>{formatReceiptMoney(total)}</span>
        </div>
      </div>
      {!paidReceipt && qr?.qrImageUrl ? (
        <div className="receipt-qr">
          <img className="receipt-qr-img" src={qr.qrImageUrl} alt="VietQR thanh toan no" />
        </div>
      ) : null}
    </div>
  )
}

function DebtPrintPreview({
  customerName,
  printedAt,
  items,
  qr,
  qrNotice,
  paidReceipt = false,
  autoPrint = false,
  onClose,
  onPrint,
}) {
  useEffect(() => {
    if (!autoPrint) return undefined
    let cancelled = false

    async function run() {
      // Đợi ảnh QR (nếu có) load xong rồi in luôn
      if (qr?.qrImageUrl) {
        await new Promise((resolve) => {
          const img = new Image()
          img.onload = resolve
          img.onerror = resolve
          img.src = qr.qrImageUrl
        })
      } else {
        await new Promise((r) => window.setTimeout(r, 40))
      }
      if (!cancelled) await onPrint()
    }

    run()
    return () => {
      cancelled = true
    }
  }, [autoPrint])

  return (
    <div
      className={`modal-backdrop print-preview-backdrop${autoPrint ? ' print-preview-auto' : ''}`}
      role="presentation"
      onClick={autoPrint ? undefined : onClose}
    >
      <div
        className="print-preview-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="print-preview-title"
        onClick={(e) => e.stopPropagation()}
      >
        {!autoPrint && (
          <div className="print-preview-toolbar no-print">
            <h2 id="print-preview-title">Xem trước khi in</h2>
            <div className="actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Đóng
              </button>
              <button type="button" onClick={onPrint}>
                In
              </button>
            </div>
          </div>
        )}
        {!autoPrint && !paidReceipt && !qr?.qrImageUrl && (
          <div className="print-qr-missing no-print">
            <p>
              <strong>Chưa có mã QR trên hóa đơn.</strong> {qrNotice || 'Cần bật QR trong Cài đặt.'}
            </p>
            <Link className="btn" to="/settings">
              Mở Cài đặt QR
            </Link>
          </div>
        )}
        <div className="print-preview-body">
          <DebtReceipt
            customerName={customerName}
            printedAt={printedAt}
            items={items}
            qr={qr}
            paidReceipt={paidReceipt}
          />
        </div>
      </div>
    </div>
  )
}
