import { useEffect, useMemo, useState } from 'react'
import DatePicker from 'react-datepicker'
import { Link, useParams } from 'react-router-dom'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import ConfirmDialog from '../../shared/ConfirmDialog'
import DateTimeCell from '../../shared/DateTimeCell'
import Pagination from '../../shared/Pagination'
import {
  datePickerViProps,
  parseYm,
  parseYmd,
  parseYear,
  toYm,
  toYmd,
  toYear,
} from '../../shared/viDatePicker'

const CURRENT_YEAR = new Date().getFullYear()

export default function CustomerDetailPage() {
  const { id } = useParams()
  const [customer, setCustomer] = useState(null)
  const [filterDate, setFilterDate] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [page, setPage] = useState(0)
  const [debts, setDebts] = useState({ content: [], totalPages: 0 })
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [selected, setSelected] = useState(() => new Set())
  const [batchBusy, setBatchBusy] = useState(false)
  const [confirm, setConfirm] = useState(null)

  const unpaidIds = useMemo(
    () => debts.content.filter((d) => !d.paid).map((d) => d.id),
    [debts.content],
  )
  const allUnpaidSelected = unpaidIds.length > 0 && unpaidIds.every((id) => selected.has(id))
  const selectedCount = [...selected].filter((id) => unpaidIds.includes(id)).length

  const filterParams = useMemo(() => {
    if (filterDate) {
      const [y, m, d] = filterDate.split('-').map(Number)
      if (!y || !m || !d || m < 1 || m > 12 || d < 1 || d > 31) return null
      return { year: y, month: m, day: d }
    }
    if (filterMonth) {
      const [y, m] = filterMonth.split('-').map(Number)
      if (!y || !m || m < 1 || m > 12) return null
      return { year: y, month: m }
    }
    if (filterYear) {
      const y = Number(filterYear)
      if (!Number.isInteger(y) || y < 2000 || y > CURRENT_YEAR + 1) return null
      return { year: y }
    }
    return {}
  }, [filterDate, filterMonth, filterYear])

  async function loadCustomer() {
    const c = await api(`/api/customers/${id}`)
    setCustomer(c)
  }

  async function loadDebts() {
    if (filterParams === null) {
      setError('Ngày lọc không hợp lệ')
      return
    }
    const params = new URLSearchParams({ page: String(page), size: '20' })
    if (filterParams.year) params.set('year', String(filterParams.year))
    if (filterParams.month) params.set('month', String(filterParams.month))
    if (filterParams.day) params.set('day', String(filterParams.day))
    const res = await api(`/api/customers/${id}/debts?${params}`)
    setDebts(res)
    setSelected(new Set())
    setError('')
  }

  useEffect(() => {
    loadCustomer().catch((e) => setError(e.message))
  }, [id])

  useEffect(() => {
    loadDebts().catch((e) => setError(e.message))
  }, [id, filterDate, filterMonth, filterYear, page])

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

  async function doPay(debtId) {
    setBusyId(debtId)
    try {
      await api(`/api/debts/${debtId}/pay`, { method: 'POST' })
      setConfirm(null)
      await Promise.all([loadCustomer(), loadDebts()])
    } finally {
      setBusyId(null)
    }
  }

  async function doPaySelected() {
    const ids = unpaidIds.filter((debtId) => selected.has(debtId))
    if (ids.length === 0) return
    setBatchBusy(true)
    try {
      await api('/api/debts/pay-batch', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      })
      setConfirm(null)
      await Promise.all([loadCustomer(), loadDebts()])
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

  function clearFilters() {
    setFilterDate('')
    setFilterMonth('')
    setFilterYear('')
    setPage(0)
  }

  if (!customer) {
    return <section className="panel">{error || 'Đang tải...'}</section>
  }

  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <Link to="/">← Quay lại tổng hợp</Link>
          <h1>{customer.name}</h1>
          <p>
            Tổng còn nợ:{' '}
            <strong className={Number(customer.balance) > 0 ? 'balance-unpaid' : 'balance-paid'}>
              {formatMoney(customer.balance)}
            </strong>
          </p>
        </div>
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
            + Thêm nợ
          </Link>
        </div>
      </div>

      <div className="filters">
        <label>
          Lọc theo ngày
          <DatePicker
            {...datePickerViProps}
            selected={parseYmd(filterDate)}
            onChange={(date) => {
              setFilterDate(date ? toYmd(date) : '')
              setFilterMonth('')
              setFilterYear('')
              setPage(0)
            }}
            placeholderText="Chọn ngày"
            isClearable
            minDate={new Date(2000, 0, 1)}
            maxDate={new Date(CURRENT_YEAR + 1, 11, 31)}
            className="datepicker-input"
          />
        </label>
        <label>
          Lọc theo tháng
          <DatePicker
            {...datePickerViProps}
            selected={parseYm(filterMonth)}
            onChange={(date) => {
              setFilterMonth(date ? toYm(date) : '')
              setFilterDate('')
              setFilterYear('')
              setPage(0)
            }}
            dateFormat="MM/yyyy"
            showMonthYearPicker
            placeholderText="Chọn tháng"
            isClearable
            minDate={new Date(2000, 0, 1)}
            maxDate={new Date(CURRENT_YEAR + 1, 11, 31)}
            className="datepicker-input"
          />
        </label>
        <label>
          Lọc theo năm
          <DatePicker
            {...datePickerViProps}
            selected={parseYear(filterYear)}
            onChange={(date) => {
              setFilterYear(date ? toYear(date) : '')
              setFilterDate('')
              setFilterMonth('')
              setPage(0)
            }}
            dateFormat="yyyy"
            showYearPicker
            yearItemNumber={12}
            placeholderText="Chọn năm"
            isClearable
            minDate={new Date(2000, 0, 1)}
            maxDate={new Date(CURRENT_YEAR + 1, 11, 31)}
            className="datepicker-input"
          />
        </label>
        <button type="button" className="ghost" onClick={clearFilters}>
          Xóa lọc
        </button>
      </div>

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
              <th>Ngày giờ</th>
              <th>Số tiền</th>
              <th>Sản phẩm</th>
              <th>Ghi chú</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {debts.content.map((d) => (
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
                  <DateTimeCell value={d.occurredAt} />
                </td>
                <td>{formatMoney(d.amount)}</td>
                <td>{d.productNote || '—'}</td>
                <td>{d.customerNote || '—'}</td>
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
            {debts.content.length === 0 && (
              <tr>
                <td colSpan={7}>Không có khoản nợ trong khoảng đã chọn</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} totalPages={debts.totalPages} onChange={setPage} />

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
