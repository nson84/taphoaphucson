import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../shared/api'
import ConfirmDialog from '../../shared/ConfirmDialog'
import DateTimeCell from '../../shared/DateTimeCell'
import { formatMoney } from '../../shared/format'
import Pagination from '../../shared/Pagination'

export default function DebtListPage() {
  const [q, setQ] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const [data, setData] = useState({ content: [], totalPages: 0 })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const unpaidIds = useMemo(
    () => data.content.filter((d) => !d.paid).map((d) => d.id),
    [data.content],
  )
  const allUnpaidSelected = unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id))
  const selectedCount = [...selected].filter((id) => unpaidIds.includes(id)).length

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(q)
      setPage(0)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  async function load() {
    try {
      const res = await api(`/api/debts?q=${encodeURIComponent(query)}&page=${page}&size=20`)
      setData(res)
      setError('')
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    }
  }

  useEffect(() => {
    load()
  }, [query, page])

  function toggleOne(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
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

  async function doPay(id) {
    setBusyId(id)
    try {
      await api(`/api/debts/${id}/pay`, { method: 'POST' })
      setConfirm(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  async function doPaySelected() {
    const ids = unpaidIds.filter((id) => selected.has(id))
    if (ids.length === 0) return
    setBatchBusy(true)
    try {
      await api('/api/debts/pay-batch', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      setConfirm(null)
      await load()
    } finally {
      setBatchBusy(false)
    }
  }

  async function doCancelPay(id, pin) {
    setBusyId(id)
    try {
      await api(`/api/debts/${id}/unpay`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      setConfirm(null)
      await load()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <h1>Danh sách nợ</h1>
        <div className="panel-actions">
          <button
            type="button"
            disabled={selectedCount === 0 || batchBusy}
            onClick={() =>
              setConfirm({
                type: 'pay-batch',
                title: 'Xác nhận trả nợ hàng loạt',
                message: `Bạn chắc muốn trả ${selectedCount} khoản nợ đã chọn?`,
                confirmLabel: 'Trả nợ',
              })
            }
          >
            Trả nợ đã chọn ({selectedCount})
          </button>
          <Link className="btn" to="/debts/new">
            + Tạo nợ
          </Link>
        </div>
      </div>
      <input
        className="search"
        placeholder="Tìm theo tên khách (vd: pun)..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {error && <p className="error">{error}</p>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
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
              <th>Khách</th>
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
                <td>
                  <Link to={`/customers/${d.customerId}`}>{d.customerName}</Link>
                </td>
                <td>
                  <DateTimeCell value={d.occurredAt} />
                </td>
                <td>{formatMoney(d.amount)}</td>
                <td>{d.productNote || '—'}</td>
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
                  ) : (
                    <>
                      <Link className="btn btn-edit" to={`/debts/${d.id}/edit`}>
                        Sửa
                      </Link>
                      <button
                        type="button"
                        className="btn-pay"
                        disabled={busyId === d.id}
                        onClick={() =>
                          setConfirm({
                            type: 'pay',
                            id: d.id,
                            title: 'Xác nhận trả nợ',
                            message: `Xác nhận đánh dấu đã trả khoản ${formatMoney(d.amount)}?`,
                            confirmLabel: 'Trả nợ',
                          })
                        }
                      >
                        Trả nợ
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {data.content.length === 0 && (
              <tr>
                <td colSpan={7}>Không có dữ liệu</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={data.totalPages} onChange={setPage} />

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
          if (confirm?.type === 'pay') await doPay(confirm.id)
          else if (confirm?.type === 'pay-batch') await doPaySelected()
          else if (confirm?.type === 'cancel') await doCancelPay(confirm.id, pin)
        }}
      />
    </section>
  )
}
