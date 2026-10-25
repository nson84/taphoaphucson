import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import Pagination from '../../shared/Pagination'

export default function SummaryPage() {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    api(`/api/summary?q=${encodeURIComponent(query)}&page=${page}&size=20`)
      .then(setSummary)
      .catch((e) => setError(e.message))
  }, [query, page])

  return (
    <section className="panel">
      <h1>Tổng hợp công nợ</h1>
      <p className="muted">
        Mỗi khách một dòng. Thêm nợ sẽ cộng vào khách đó. Bấm Chi tiết để xem từng lần nợ theo ngày giờ.
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
      <input
        className="search"
        placeholder="Lọc theo tên khách (vd: pun)..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Tổng còn nợ</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.customers || []).map((c) => (
              <tr key={c.id} className={Number(c.balance) > 0 ? 'row-unpaid' : 'row-paid'}>
                <td>{c.name}</td>
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
                <td colSpan={3}>Chưa có khách hàng</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {summary && (
        <Pagination page={page} totalPages={summary.totalPages} onChange={setPage} />
      )}
    </section>
  )
}
