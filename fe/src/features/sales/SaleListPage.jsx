import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart3, Eye, ShoppingCart } from 'lucide-react'
import { api } from '../../shared/api'
import { formatDateTime, formatMoney } from '../../shared/format'
import SalePayBadge from '../../shared/SalePayBadge'
import Pagination from '../../shared/Pagination'

export default function SaleListPage() {
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0 })
  const [error, setError] = useState('')

  useEffect(() => {
    api(`/api/sales?page=${page}&size=20`)
      .then(setData)
      .catch((e) => setError(e.message))
  }, [page])

  return (
    <section className="panel sale-list-page">
      <div className="panel-head sale-list-head">
        <h1 className="sale-list-title">Lịch sử bán hàng</h1>
        <div className="panel-actions">
          <Link className="btn btn-tool" to="/sales/report">
            <BarChart3 size={16} strokeWidth={2.25} aria-hidden />
            Báo cáo
          </Link>
          <Link className="btn btn-create" to="/pos">
            <ShoppingCart size={16} strokeWidth={2.25} aria-hidden />
            Bán hàng
          </Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="accent-table-wrap sale-list-table-wrap">
        <table className="accent-data-table sales-history-table">
          <colgroup>
            <col className="sales-col-code" />
            <col className="sales-col-time" />
            <col className="sales-col-customer" />
            <col className="sales-col-total" />
            <col className="sales-col-pay" />
            <col className="sales-col-action" />
          </colgroup>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Thời gian</th>
              <th>Khách</th>
              <th>Tổng</th>
              <th>Thanh toán</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {(data.content || []).map((s) => (
              <tr key={s.id} className={s.cancelledAt ? 'row-paid' : ''}>
                <td className="sales-td-code" title={s.code}>{s.code}</td>
                <td className="sales-td-time" title={formatDateTime(s.occurredAt)}>
                  {formatDateTime(s.occurredAt)}
                </td>
                <td className="sales-td-customer" title={s.customerName || 'Khách lẻ'}>
                  {s.customerName || 'Khách lẻ'}
                </td>
                <td className="sales-td-total">{formatMoney(s.totalAmount)}</td>
                <td className="sales-td-pay">
                  <SalePayBadge
                    compact
                    paymentMethod={s.paymentMethod}
                    debtAmount={s.debtAmount}
                    cancelledAt={s.cancelledAt}
                  />
                </td>
                <td className="sales-td-action">
                  <Link className="btn btn-info sales-detail-btn" to={`/sales/${s.id}`}>
                    <Eye size={15} strokeWidth={2} aria-hidden />
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {(!data.content || data.content.length === 0) && (
              <tr>
                <td colSpan={6}>Chưa có hóa đơn</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages || 0} onChange={setPage} />
    </section>
  )
}
