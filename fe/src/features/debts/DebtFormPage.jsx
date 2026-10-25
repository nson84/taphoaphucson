import { useEffect, useState } from 'react'
import DatePicker from 'react-datepicker'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api'
import ConfirmDialog from '../../shared/ConfirmDialog'
import {
  formatMoney,
  formatMoneyInput,
  nowVietnamLocalInput,
  parseMoneyInput,
  toApiDateTime,
} from '../../shared/format'
import {
  datePickerViProps,
  parseDateTimeLocal,
  toDateTimeLocal,
} from '../../shared/viDatePicker'

const empty = {
  customerName: '',
  customerNote: '',
  amount: '',
  productNote: '',
  occurredAt: nowVietnamLocalInput(),
}

export default function DebtFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const [form, setForm] = useState(empty)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmReactivate, setConfirmReactivate] = useState(false)

  useEffect(() => {
    if (!isEdit) {
      setForm({ ...empty, occurredAt: nowVietnamLocalInput() })
      setPaid(false)
      return
    }
    api(`/api/debts/${id}`)
      .then((d) => {
        setForm({
          customerName: d.customerName || '',
          customerNote: d.customerNote || '',
          amount: d.amount != null ? String(Math.round(Number(d.amount))) : '',
          productNote: d.productNote || '',
          occurredAt: d.occurredAt ? d.occurredAt.slice(0, 16) : nowVietnamLocalInput(),
        })
        setPaid(Boolean(d.paid))
      })
      .catch((e) => setError(e.message))
  }, [id, isEdit])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function onAmountChange(e) {
    update('amount', parseMoneyInput(e.target.value))
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (paid) return
    setError('')

    const name = form.customerName.trim()
    const amount = Number(form.amount)
    if (!name) {
      setError('Tên khách không được trống')
      return
    }
    if (!form.occurredAt) {
      setError('Ngày giờ không được trống')
      return
    }
    if (!Number.isFinite(amount) || amount < 1) {
      setError('Số tiền phải lớn hơn hoặc bằng 1')
      return
    }

    setLoading(true)
    const payload = {
      customerName: name,
      customerNote: form.customerNote,
      amount,
      productNote: form.productNote,
      occurredAt: toApiDateTime(form.occurredAt),
    }
    try {
      if (isEdit) {
        await api(`/api/debts/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      } else {
        await api('/api/debts', { method: 'POST', body: JSON.stringify(payload) })
      }
      navigate('/debts')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function reactivate(pin) {
    setLoading(true)
    try {
      await api(`/api/debts/${id}/unpay`, {
        method: 'POST',
        body: JSON.stringify({ pin }),
      })
      setConfirmReactivate(false)
      setPaid(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="panel form-page">
      <div className="form-page-head">
        <Link className="form-back" to="/debts">
          ← Quay lại danh sách
        </Link>
        <div className="form-page-title-row">
          <h1>{isEdit ? 'Sửa khoản nợ' : 'Tạo khoản nợ'}</h1>
          {isEdit && (
            <span className={`status-badge ${paid ? 'status-paid' : 'status-unpaid'}`}>
              {paid ? 'Hết nợ' : 'Còn nợ'}
            </span>
          )}
        </div>
        <p className="form-page-lead">
          {paid
            ? 'Khoản này đã hết nợ. Muốn sửa lại thì bấm “Mở lại còn nợ” bên dưới.'
            : 'Điền đủ các ô có dấu *. Chữ to, dễ đọc — kiểm tra số tiền trước khi lưu.'}
        </p>
      </div>

      {paid && (
        <div className="notice notice-paid">
          <div>
            <p className="notice-title">Đã hết nợ</p>
            <p>Nếu đánh dấu nhầm, mở lại để chuyển về còn nợ (cần mã PIN).</p>
          </div>
          <button
            type="button"
            className="btn-edit"
            onClick={() => setConfirmReactivate(true)}
            disabled={loading}
          >
            Mở lại còn nợ
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmReactivate}
        title="Xác nhận mở lại còn nợ"
        message="Nhập mã PIN để hủy trạng thái đã trả."
        confirmLabel="Mở lại còn nợ"
        requirePin
        danger
        busy={loading}
        onClose={() => setConfirmReactivate(false)}
        onConfirm={reactivate}
      />

      <form className="form-card" onSubmit={onSubmit}>
        <div className="form-section">
          <h2 className="form-section-title">Thông tin khách</h2>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">
                Tên khách <span className="req">*</span>
              </span>
              <input
                required
                disabled={paid}
                value={form.customerName}
                onChange={(e) => update('customerName', e.target.value)}
                placeholder="Ví dụ: Nguyễn Văn An"
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span className="field-label">
                Ngày giờ <span className="req">*</span>
              </span>
              <DatePicker
                {...datePickerViProps}
                selected={parseDateTimeLocal(form.occurredAt)}
                onChange={(date) => update('occurredAt', toDateTimeLocal(date))}
                showTimeSelect
                timeIntervals={1}
                timeCaption="Giờ"
                dateFormat="dd/MM/yyyy HH:mm"
                placeholderText="Chọn ngày giờ"
                disabled={paid}
                required
                className="datepicker-input"
              />
              <span className="field-hint">Giờ theo Việt Nam</span>
            </label>
            <label className="field full">
              <span className="field-label">Ghi chú lần nợ</span>
              <textarea
                rows={2}
                disabled={paid}
                value={form.customerNote}
                onChange={(e) => update('customerNote', e.target.value)}
                placeholder="Ví dụ: hẹn trả cuối tuần"
              />
            </label>
          </div>
        </div>

        <div className="form-section">
          <h2 className="form-section-title">Số tiền & hàng hóa</h2>
          <div className="form-grid">
            <label className="field field-amount full">
              <span className="field-label">
                Số tiền nợ <span className="req">*</span>
              </span>
              <input
                type="text"
                inputMode="numeric"
                required
                disabled={paid}
                value={formatMoneyInput(form.amount)}
                onChange={onAmountChange}
                placeholder="Ví dụ: 50.000"
                className="amount-input"
              />
              {form.amount ? (
                <span className="amount-preview">{formatMoney(form.amount)}</span>
              ) : (
                <span className="field-hint">Chỉ nhập số, hệ thống tự thêm dấu chấm</span>
              )}
            </label>
            <label className="field full">
              <span className="field-label">Ghi chú sản phẩm</span>
              <textarea
                rows={3}
                disabled={paid}
                value={form.productNote}
                onChange={(e) => update('productNote', e.target.value)}
                placeholder="Ví dụ: 2 kg gạo, 1 thùng mì"
              />
            </label>
          </div>
        </div>

        {error && (
          <p className="error form-error" role="alert">
            {error}
          </p>
        )}

        <div className="form-actions">
          <button type="button" className="ghost btn-lg" onClick={() => navigate(-1)}>
            Hủy
          </button>
          <button type="submit" className="btn-lg" disabled={loading || paid}>
            {loading ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo khoản nợ'}
          </button>
        </div>
      </form>
    </section>
  )
}
