import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../../shared/api'
import {
  AMOUNT_SORT_DESC,
  amountSortLabel,
  toggleAmountSort,
} from '../../shared/amountSort'
import { formatCustomerDisplayName } from '../../shared/customerName'
import { formatParentRefLabel } from '../../shared/parentRef'
import { formatMoney } from '../../shared/format'
import Pagination from '../../shared/Pagination'
import KindFilterButtons from '../../shared/KindFilterButtons'
import { KIND_FILTER_ALL, appendKindFilterQueryParams, customerSuggestUrl } from '../../shared/kindFilter'

export default function SummaryPage() {
  const navigate = useNavigate()
  const [draft, setDraft] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [amountSort, setAmountSort] = useState(AMOUNT_SORT_DESC)
  const [kindFilter, setKindFilter] = useState(KIND_FILTER_ALL)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)
  const wrapRef = useRef(null)
  const suggestSeq = useRef(0)

  useEffect(() => {
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      size: '20',
      sort: amountSort,
    })
    appendKindFilterQueryParams(params, kindFilter)
    api(`/api/summary?${params}`)
      .then(setSummary)
      .catch((e) => setError(e.message))
  }, [query, page, amountSort, kindFilter])

  useEffect(() => {
    const q = draft.trim()
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
  }, [draft, kindFilter])

  useEffect(() => {
    function onDocClick(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function applySearch(e) {
    e?.preventDefault()
    setPage(0)
    setQuery(draft.trim())
    setShowSuggest(false)
  }

  function clearSearch() {
    setDraft('')
    setQuery('')
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
    setDraft(customer.name)
    setShowSuggest(false)
    navigate(`/customers/${customer.id}`)
  }

  return (
    <section className="panel">
      <h1>Tổng hợp công nợ</h1>
      <p className="muted">
        Chỉ hiện khách còn nợ. Thêm nợ sẽ cộng vào khách đó. Khách hết nợ chuyển sang Thùng rác (giữ 60 ngày).
      </p>
      {summary && (
        <div className="stat-row">
          <div className="stat">
            <span>Tổng nợ tất cả khách</span>
            <strong className={Number(summary.totalUnpaid) > 0 ? 'balance-unpaid' : 'balance-paid'}>
              {formatMoney(summary.totalUnpaid)}
            </strong>
          </div>
          <div className="stat">
            <span>Số lượng khách hàng</span>
            <strong>{summary.customerCount}</strong>
          </div>
        </div>
      )}

      <form className="summary-search" onSubmit={applySearch} ref={wrapRef}>
        <div className="summary-search-row">
          <div className="summary-search-input-wrap">
            <input
              type="search"
              className="summary-search-input"
              placeholder="Tìm tên khách..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggest(true)
              }}
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={showSuggest}
            />
            {showSuggest && (suggestLoading || suggestions.length > 0 || draft.trim()) && (
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
          <button type="submit">Tìm kiếm</button>
          <button type="button" className="btn-cancel" onClick={clearSearch}>
            Xóa
          </button>
          <button
            type="button"
            className="ghost amount-sort-btn"
            onClick={() => {
              setPage(0)
              setAmountSort((s) => toggleAmountSort(s))
            }}
            title="Đảo chiều sắp xếp theo tổng nợ"
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
              <th>Khách hàng</th>
              <th>Quan hệ / xưởng</th>
              <th>Tổng còn nợ</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.customers || []).map((c) => (
              <tr key={c.id} className={Number(c.balance) > 0 ? 'row-unpaid' : 'row-paid'}>
                <td>{formatCustomerDisplayName(c.name, c.parentName, c.company)}</td>
                <td>{formatParentRefLabel(c.parentName) || '—'}</td>
                <td>
                  <span className={Number(c.balance) > 0 ? 'balance-unpaid' : 'balance-paid'}>
                    {formatMoney(c.balance)}
                  </span>
                </td>
                <td>
                  <Link className="btn" to={`/customers/${c.id}`}>
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {summary && summary.customers?.length === 0 && (
              <tr>
                <td colSpan={4}>Chưa có khách hàng</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {summary && <Pagination page={page} totalPages={summary.totalPages} onChange={setPage} />}
    </section>
  )
}
