import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import {
  AMOUNT_SORT_DESC,
  amountSortLabel,
  toggleAmountSort,
} from '../../shared/amountSort'
import DateTimeCell from '../../shared/DateTimeCell'
import { formatCustomerDisplayName } from '../../shared/customerName'
import { formatMoney } from '../../shared/format'
import Pagination from '../../shared/Pagination'
import ExpandableTextCell from '../../shared/ExpandableTextCell'
import KindFilterButtons from '../../shared/KindFilterButtons'
import { KIND_FILTER_ALL, customerSuggestUrl, debtTypeFromKindFilter } from '../../shared/kindFilter'

function debtTypeLabel(type) {
  return type === 'COMPANY' ? 'Công ty' : 'Cá nhân'
}

export default function DebtListPage() {
  const [nameDraft, setNameDraft] = useState('')
  const [nameQuery, setNameQuery] = useState('')
  const [page, setPage] = useState(0)
  const [amountSort, setAmountSort] = useState(AMOUNT_SORT_DESC)
  const [kindFilter, setKindFilter] = useState(KIND_FILTER_ALL)
  const [data, setData] = useState({ content: [], totalPages: 0 })
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const nameWrapRef = useRef(null)
  const suggestSeq = useRef(0)

  async function load() {
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: '20',
        sort: amountSort,
      })
      if (nameQuery.trim()) params.set('q', nameQuery.trim())
      const debtType = debtTypeFromKindFilter(kindFilter)
      if (debtType) params.set('debtType', debtType)
      const res = await api(`/api/debts?${params}`)
      setData(res)
      setError('')
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [nameQuery, page, amountSort, kindFilter])

  useEffect(() => {
    const q = nameDraft.trim()
    if (q.length < 1) {
      setSuggestions([])
      setShowSuggest(false)
      setSuggestLoading(false)
      return
    }
    const seq = ++suggestSeq.current
    setSuggestLoading(true)
    const t = setTimeout(() => {
      api(customerSuggestUrl(q, kindFilter))
        .then((res) => {
          if (seq !== suggestSeq.current) return
          setSuggestions(res.content || [])
          setShowSuggest(true)
        })
        .catch(() => {
          if (seq !== suggestSeq.current) return
          setSuggestions([])
        })
        .finally(() => {
          if (seq === suggestSeq.current) setSuggestLoading(false)
        })
    }, 200)
    return () => clearTimeout(t)
  }, [nameDraft, kindFilter])

  useEffect(() => {
    function onDocClick(e) {
      if (nameWrapRef.current && !nameWrapRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function applyFilters(e) {
    e?.preventDefault()
    setPage(0)
    setNameQuery(nameDraft.trim())
    setShowSuggest(false)
  }

  function clearFilters() {
    setNameDraft('')
    setNameQuery('')
    setPage(0)
    setSuggestions([])
    setShowSuggest(false)
    setKindFilter(KIND_FILTER_ALL)
    setError('')
  }

  function onKindFilterChange(next) {
    setPage(0)
    setKindFilter(next)
  }

  function pickSuggestion(customer) {
    const name = customer.name
    setNameDraft(name)
    setShowSuggest(false)
    setPage(0)
    setNameQuery(name)
  }

  return (
    <section className="panel debt-list-main">
      <div className="panel-head">
        <h1>Danh sách nợ và ghi nợ</h1>
        <div className="panel-actions">
          <Link className="btn" to="/debts/new">
            + Tạo nợ
          </Link>
        </div>
      </div>

      <form className="debt-filter-bar" onSubmit={applyFilters}>
        <label className="debt-filter-field">
          Tên khách hàng
          <div className="debt-filter-suggest-wrap" ref={nameWrapRef}>
            <input
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggest(true)
              }}
              placeholder="Vd: an, công ty ABC"
              maxLength={80}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showSuggest}
            />
            {showSuggest && (suggestLoading || suggestions.length > 0 || nameDraft.trim()) && (
              <ul className="summary-suggest-list" role="listbox">
                {suggestLoading && <li className="summary-suggest-empty">Đang tìm…</li>}
                {!suggestLoading && suggestions.length === 0 && (
                  <li className="summary-suggest-empty">Không có gợi ý</li>
                )}
                {!suggestLoading &&
                  suggestions.map((c) => (
                    <li key={c.id} role="option">
                      <button type="button" className="summary-suggest-item" onClick={() => pickSuggestion(c)}>
                        <span className="summary-suggest-name">
                          {formatCustomerDisplayName(c.name, c.parentName, c.company)}
                        </span>
                        <span
                          className={`summary-suggest-balance ${Number(c.balance) > 0 ? 'balance-unpaid' : 'balance-paid'}`}
                        >
                          {formatMoney(c.balance)}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}
          </div>
        </label>
        <div className="debt-filter-actions">
          <button type="submit">Tìm kiếm</button>
          <button type="button" className="btn-cancel" onClick={clearFilters}>
            Xóa lọc
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
          <KindFilterButtons value={kindFilter} onChange={onKindFilterChange} />
        </div>
      </form>

      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Loại</th>
              <th>Khách / Công ty</th>
              <th>Người lấy</th>
              <th>Ngày giờ</th>
              <th>Số tiền</th>
              <th>Sản phẩm</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((d) => (
              <tr key={d.id} className={d.paid ? 'row-paid' : 'row-unpaid'}>
                <td>
                  <span
                    className={`debt-type-badge ${d.debtType === 'COMPANY' ? 'type-company' : 'type-personal'}`}
                  >
                    {debtTypeLabel(d.debtType)}
                  </span>
                </td>
                <td>
                  <Link to={`/customers/${d.customerId}`}>
                    {formatCustomerDisplayName(d.customerName, d.parentName, d.debtType === 'COMPANY')}
                  </Link>
                </td>
                <td>
                  <ExpandableTextCell value={d.pickerName} title="Chi tiết người lấy" />
                </td>
                <td>
                  <DateTimeCell value={d.occurredAt} />
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
                  <Link className="btn" to={`/customers/${d.customerId}`}>
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {data.content.length === 0 && (
              <tr>
                <td colSpan={8}>Không có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
    </section>
  )
}
