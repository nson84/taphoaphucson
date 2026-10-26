import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatCustomerDisplayName } from '../../shared/customerName'
import { formatMoney } from '../../shared/format'
import Pagination from '../../shared/Pagination'

export default function CustomerListPage() {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    api(`/api/customers?q=${encodeURIComponent(query)}&page=${page}&size=20`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [query, page])

  return (
    <section className="panel">
      <h1>Khách hàng</h1>
      <input
        className="search"
        placeholder="Tìm theo tên (vd: pun)..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tên</th>
              <th>Ghi chú</th>
              <th>Còn nợ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {data.content.map((c) => (
              <tr key={c.id} className={Number(c.balance) > 0 ? 'row-unpaid' : 'row-paid'}>
                <td>{formatCustomerDisplayName(c.name, c.parentName, c.company)}</td>
                <td>{c.note || '—'}</td>
                <td>
                  <span className={Number(c.balance) > 0 ? 'balance-unpaid' : 'balance-paid'}>
                    {formatMoney(c.balance)}
                  </span>
                </td>
                <td>
                  <Link to={`/customers/${c.id}`}>Chi tiết</Link>
                </td>
              </tr>
            ))}
            {data.content.length === 0 && (
              <tr>
                <td colSpan={4}>Không có khách hàng</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />
    </section>
  )
}
