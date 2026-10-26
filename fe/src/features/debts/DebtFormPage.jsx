import { useEffect, useRef, useState } from 'react'
import DatePicker from 'react-datepicker'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../shared/api'
import ConfirmDialog from '../../shared/ConfirmDialog'
import { formatCustomerDisplayName } from '../../shared/customerName'
import { useToast } from '../../shared/ToastContext'
import {
  formatMoney,
  formatMoneyInput,
  nowVietnamLocalInput,
  parseMoneyInput,
  toApiDateTime,
} from '../../shared/format'
import { validateDebtAmount } from '../../shared/moneyValidation'
import {
  acceptValidDateChange,
  datePickerViProps,
  formatOccurredDisplay,
  parseDateTimeLocal,
  parseStrictDisplayDate,
  toDateTimeLocal,
} from '../../shared/viDatePicker'
import {
  COMPANY_REF_TYPES,
  PARENT_REF_TYPES,
  encodeParentRef,
  isCompanyRefType,
  parseParentRef,
  parentRefMeta,
  parentRefNameMaxLength,
  parentRefPlaceholder,
} from '../../shared/parentRef'

const empty = {
  debtType: '',
  customerName: '',
  parentRefType: '',
  parentName: '',
  pickerName: '',
  amount: '',
  productNote: '',
  occurredAt: nowVietnamLocalInput(),
}

function validateForm(form) {
  const errors = {}
  const isCompany = form.debtType === 'COMPANY'
  const name = form.customerName.trim()
  const pickerName = form.pickerName.trim()
  const productNote = form.productNote.trim()
  const occurredDate = parseDateTimeLocal(form.occurredAt)

  if (!form.debtType) {
    errors.debtType = 'Chọn loại nợ'
  }

  if (!name) {
    errors.customerName = isCompany ? 'Tên công ty không được trống' : 'Tên khách hàng không được trống'
  } else if (name.length > 80) {
    errors.customerName = isCompany ? 'Tên công ty tối đa 80 ký tự' : 'Tên khách hàng tối đa 80 ký tự'
  }

  const parentName = form.parentName.trim()
  const parentMax = parentRefNameMaxLength(
    form.parentRefType || (isCompany ? 'COMPANY_OWNER' : ''),
  )
  if (isCompany && !isCompanyRefType(form.parentRefType)) {
    errors.parentName = 'Chọn chủ công ty hoặc nhân viên công ty'
  } else if (parentName.length > parentMax) {
    errors.parentName = form.parentRefType
      ? `Tên ${parentRefMeta(form.parentRefType).short} tối đa ${parentMax} ký tự`
      : `Ghi chú quan hệ tối đa ${parentMax} ký tự`
  }

  if (!pickerName) {
    errors.pickerName = isCompany
      ? 'Tên khách hàng lấy không được trống'
      : 'Tên người lấy không được trống'
  } else if (pickerName.length > 80) {
    errors.pickerName = 'Tên người lấy tối đa 80 ký tự'
  }

  if (!form.occurredAt || !occurredDate) {
    errors.occurredAt = 'Ngày giờ không hợp lệ — vui lòng chọn ngày tháng năm đúng'
  }

  const money = validateDebtAmount(form.amount)
  if (!money.ok) {
    errors.amount = money.message
  }

  if (productNote.length > 200) {
    errors.productNote = 'Ghi chú sản phẩm tối đa 200 ký tự'
  }

  return errors
}

function mapApiErrorToFields(message) {
  const msg = message || 'Có lỗi xảy ra'
  const lower = msg.toLowerCase()
  if (lower.includes('loại nợ')) return { debtType: msg }
  if (
    lower.includes('bố/mẹ') ||
    lower.includes('bố mẹ') ||
    lower.includes('ông bà') ||
    lower.includes('xưởng') ||
    lower.includes('tham chiếu')
  ) {
    return { parentName: msg }
  }
  if (lower.includes('công ty') || lower.includes('tên khách') || lower.includes('80 ký tự')) {
    return { customerName: msg }
  }
  if (lower.includes('người lấy') || lower.includes('khách hàng lấy')) {
    return { pickerName: msg }
  }
  if (lower.includes('ngày') || lower.includes('giờ') || lower.includes('thời gian')) {
    return { occurredAt: msg }
  }
  if (lower.includes('ghi chú sản phẩm')) {
    return { productNote: msg }
  }
  if (
    lower.includes('số tiền') ||
    lower.includes('tròn nghìn') ||
    lower.includes('1.000') ||
    lower.includes('10.000.000')
  ) {
    return { amount: msg }
  }
  return { form: msg }
}

export default function DebtFormPage() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState(empty)
  const [paid, setPaid] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [confirmReactivate, setConfirmReactivate] = useState(false)
  const occurredRawRef = useRef('')
  const occurredFocusDisplayRef = useRef('')
  const occurredDirtyRef = useRef(false)
  const keepOccurredErrorRef = useRef(false)
  const formRef = useRef(form)
  formRef.current = form
  const nameSuggestRef = useRef(null)
  const suggestSeq = useRef(0)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggest, setShowSuggest] = useState(false)
  const [suggestLoading, setSuggestLoading] = useState(false)

  const isCompany = form.debtType === 'COMPANY'
  const typeChosen = Boolean(form.debtType)

  useEffect(() => {
    if (!isEdit) {
      setForm({ ...empty, occurredAt: nowVietnamLocalInput() })
      setPaid(false)
      setFieldErrors({})
      setSuggestions([])
      setShowSuggest(false)
      return
    }
    api(`/api/debts/${id}`)
      .then((d) => {
        setForm({
          debtType: d.debtType || 'PERSONAL',
          customerName: d.customerName || '',
          ...(() => {
            const company = (d.debtType || '') === 'COMPANY'
            const ref = parseParentRef(d.parentName || '')
            // Công ty: bắt buộc map đúng Chủ / Nhân viên từ parentName đã lưu
            if (company) {
              const type = isCompanyRefType(ref.type) ? ref.type : 'COMPANY_OWNER'
              return {
                parentRefType: type,
                parentName: isCompanyRefType(ref.type) ? ref.name : '',
              }
            }
            return { parentRefType: ref.type, parentName: ref.name }
          })(),
          pickerName: d.pickerName || '',
          amount: d.amount != null ? String(Math.round(Number(d.amount))) : '',
          productNote: d.productNote || '',
          occurredAt: d.occurredAt ? d.occurredAt.slice(0, 16) : nowVietnamLocalInput(),
        })
        setPaid(Boolean(d.paid))
        setFieldErrors({})
        setShowSuggest(false)
      })
      .catch((e) => setFieldErrors({ form: e.message }))
  }, [id, isEdit])

  useEffect(() => {
    if (paid || !typeChosen) {
      setSuggestions([])
      setShowSuggest(false)
      return
    }
    const q = form.customerName.trim()
    if (q.length < 1) {
      setSuggestions([])
      setShowSuggest(false)
      setSuggestLoading(false)
      return
    }
    const seq = ++suggestSeq.current
    setSuggestLoading(true)
    const t = setTimeout(() => {
      // nameOnly: tránh "Nhà" khớp nhầm "Nhân viên công ty" (bỏ dấu nha ⊂ nhan)
      api(`/api/customers?q=${encodeURIComponent(q)}&page=0&size=8&nameOnly=true`)
        .then((res) => {
          if (seq !== suggestSeq.current) return
          let list = res.content || []
          if (isCompany) list = list.filter((c) => c.company)
          else list = list.filter((c) => !c.company)
          setSuggestions(list)
          // Khi sửa: không tự xổ gợi ý (tránh chọn nhầm khách khác → mất vai trò Bác/…)
          if (!isEdit) setShowSuggest(true)
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
  }, [form.customerName, paid, typeChosen, isCompany, isEdit])

  useEffect(() => {
    function onDocClick(e) {
      if (nameSuggestRef.current && !nameSuggestRef.current.contains(e.target)) {
        setShowSuggest(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setFieldErrors((prev) => {
      if (!prev[field] && !prev.form) return prev
      const next = { ...prev }
      delete next[field]
      delete next.form
      return next
    })
  }

  function pickCustomerSuggestion(customer) {
    const ref = parseParentRef(customer.parentName || '')
    setForm((prev) => {
      const company = prev.debtType === 'COMPANY'
      return {
        ...prev,
        customerName: customer.name || '',
        parentRefType: company
          ? isCompanyRefType(ref.type)
            ? ref.type
            : 'COMPANY_OWNER'
          : ref.type,
        parentName: company && !isCompanyRefType(ref.type) ? '' : ref.name,
      }
    })
    setShowSuggest(false)
    setSuggestions([])
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.customerName
      delete next.parentName
      delete next.form
      return next
    })
  }

  function chooseType(debtType) {
    setForm((prev) => ({
      ...prev,
      debtType,
      parentRefType: debtType === 'COMPANY' ? 'COMPANY_OWNER' : '',
      parentName: '',
      occurredAt: prev.occurredAt || nowVietnamLocalInput(),
    }))
    setFieldErrors({})
  }

  function onAmountChange(e) {
    // Tối đa 10.000.000 đ → 8 chữ số
    update('amount', parseMoneyInput(e.target.value).slice(0, 8))
  }

  function setOccurredAt(value, { clearError = true } = {}) {
    setForm((prev) => ({ ...prev, occurredAt: value }))
    occurredRawRef.current = ''
    if (!clearError) return
    setFieldErrors((prev) => {
      if (!prev.occurredAt && !prev.form) return prev
      const next = { ...prev }
      delete next.occurredAt
      delete next.form
      return next
    })
  }

  function resetOccurredAtToNow(message) {
    const now = nowVietnamLocalInput()
    keepOccurredErrorRef.current = Boolean(message)
    setOccurredAt(now, { clearError: !message })
    setFieldErrors((prev) => {
      const next = { ...prev }
      delete next.form
      if (message) next.occurredAt = message
      else delete next.occurredAt
      return next
    })
  }

  function onOccurredAtFocus() {
    const display = formatOccurredDisplay(formRef.current.occurredAt)
    occurredFocusDisplayRef.current = display
    occurredRawRef.current = display
    occurredDirtyRef.current = false
  }

  function onOccurredAtChangeRaw(e) {
    if (e?.target && typeof e.target.value === 'string') {
      occurredRawRef.current = e.target.value
      occurredDirtyRef.current = e.target.value.trim() !== occurredFocusDisplayRef.current.trim()
    }
  }

  function onOccurredAtBlur() {
    if (!occurredDirtyRef.current) {
      occurredRawRef.current = ''
      return
    }
    occurredDirtyRef.current = false
    const raw = (occurredRawRef.current || '').trim()
    if (!raw) {
      resetOccurredAtToNow('Ngày giờ không được trống — đã trả về thời gian hiện tại')
      return
    }
    if (raw === occurredFocusDisplayRef.current.trim()) {
      occurredRawRef.current = ''
      return
    }
    const parsed = parseStrictDisplayDate(raw, 'dd/MM/yyyy HH:mm')
    if (!parsed) {
      resetOccurredAtToNow('Không nhập ngày không tồn tại — đã trả về thời gian hiện tại')
      return
    }
    setOccurredAt(toDateTimeLocal(parsed), { clearError: true })
  }

  async function onSubmit(e) {
    e.preventDefault()
    if (paid) return

    const errors = validateForm(form)
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) return

    setLoading(true)
    const payload = {
      debtType: form.debtType,
      customerName: form.customerName.trim(),
      parentName: encodeParentRef(
        form.debtType === 'COMPANY'
          ? form.parentRefType || 'COMPANY_OWNER'
          : form.parentRefType || '',
        form.parentName,
      ),
      pickerName: form.pickerName.trim(),
      amount: Number(form.amount),
      productNote: form.productNote.trim(),
      occurredAt: toApiDateTime(form.occurredAt),
    }
    try {
      if (isEdit) {
        await api(`/api/debts/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
        toast.success('Đã lưu thay đổi khoản nợ')
      } else {
        await api('/api/debts', { method: 'POST', body: JSON.stringify(payload) })
        toast.success('Tạo khoản nợ thành công')
      }
      navigate('/debts')
    } catch (err) {
      const mapped = mapApiErrorToFields(err.message)
      setFieldErrors(mapped)
      toast.error(err.message || (isEdit ? 'Lưu khoản nợ thất bại' : 'Tạo khoản nợ thất bại'))
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
      toast.success('Đã mở lại còn nợ')
    } catch (err) {
      toast.error(err.message || 'Mở lại còn nợ thất bại')
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
            : typeChosen
              ? isCompany
                ? 'Ghi nợ công ty — điền tên công ty, người lấy hàng và số tiền.'
                : 'Ghi nợ cá nhân — điền tên khách, người lấy hộ và số tiền.'
              : 'Chọn loại ghi nợ trước khi điền thông tin.'}
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

      {!typeChosen && !isEdit ? (
        <div className="debt-type-chooser">
          <button type="button" className="debt-type-card type-personal" onClick={() => chooseType('PERSONAL')}>
            <span className="debt-type-card-title">Cá nhân</span>
            <span className="debt-type-card-desc">
              Ghi nợ cho khách cá nhân — có tên người lấy hộ (con mua hộ mẹ, cháu mua hộ bà…).
            </span>
          </button>
          <button type="button" className="debt-type-card type-company" onClick={() => chooseType('COMPANY')}>
            <span className="debt-type-card-title">Công ty</span>
            <span className="debt-type-card-desc">
              Ghi nợ cho công ty — có tên người lấy hàng.
            </span>
          </button>
          {fieldErrors.debtType && (
            <p className="error" role="alert">
              {fieldErrors.debtType}
            </p>
          )}
        </div>
      ) : (
        <form className="form-card" onSubmit={onSubmit} noValidate>
          {!isEdit && (
            <div className="debt-type-switch">
              <span className={`debt-type-badge ${isCompany ? 'type-company' : 'type-personal'}`}>
                {isCompany ? 'Công ty' : 'Cá nhân'}
              </span>
              <button
                type="button"
                className="ghost"
                disabled={paid}
                onClick={() => {
                  setForm((prev) => ({ ...empty, occurredAt: nowVietnamLocalInput() }))
                  setFieldErrors({})
                }}
              >
                Đổi loại nợ
              </button>
            </div>
          )}

          {isEdit && (
            <div className="debt-type-switch">
              <label className="field inline-type">
                <span className="field-label">Loại nợ</span>
                <select
                  disabled={paid}
                  value={form.debtType}
                  onChange={(e) => update('debtType', e.target.value)}
                >
                  <option value="PERSONAL">Cá nhân</option>
                  <option value="COMPANY">Công ty</option>
                </select>
              </label>
            </div>
          )}

          <div className="form-section">
            <h2 className="form-section-title">{isCompany ? 'Thông tin công ty' : 'Thông tin khách'}</h2>
            <div className="form-grid">
              <label className={`field${fieldErrors.customerName ? ' field-invalid' : ''}`}>
                <span className="field-label">
                  {isCompany ? 'Tên công ty' : 'Tên khách hàng'} <span className="req">*</span>
                </span>
                <div className="debt-filter-suggest-wrap" ref={nameSuggestRef}>
                  <input
                    disabled={paid}
                    maxLength={80}
                    value={form.customerName}
                    onChange={(e) => update('customerName', e.target.value)}
                    onFocus={() => {
                      if (suggestions.length > 0) setShowSuggest(true)
                    }}
                    placeholder={isCompany ? 'Ví dụ: Công ty ABC' : 'Ví dụ: Nguyễn Văn An'}
                    autoComplete="off"
                    aria-autocomplete="list"
                    aria-expanded={showSuggest}
                    aria-invalid={Boolean(fieldErrors.customerName)}
                  />
                  {showSuggest && (suggestLoading || suggestions.length > 0 || form.customerName.trim()) && (
                    <ul className="summary-suggest-list" role="listbox">
                      {suggestLoading && <li className="summary-suggest-empty">Đang tìm…</li>}
                      {!suggestLoading && suggestions.length === 0 && (
                        <li className="summary-suggest-empty">Không có gợi ý</li>
                      )}
                      {!suggestLoading &&
                        suggestions.map((c) => (
                          <li key={c.id} role="option">
                            <button
                              type="button"
                              className="summary-suggest-item"
                              onClick={() => pickCustomerSuggestion(c)}
                            >
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
                {fieldErrors.customerName ? (
                  <span className="field-error" role="alert">
                    {fieldErrors.customerName}
                  </span>
                ) : (
                  <span className="field-hint">{form.customerName.length}/80 ký tự</span>
                )}
              </label>

              {typeChosen && (
                <div className={`field full${fieldErrors.parentName ? ' field-invalid' : ''}`}>
                  <span className="field-label">
                    {isCompany ? 'Vai trò người lấy' : 'Lựa chọn quan hệ / xưởng'}
                  </span>
                  <div
                    className="parent-ref-chips"
                    role={isCompany ? 'radiogroup' : 'group'}
                    aria-label={isCompany ? 'Vai trò người lấy' : 'Lựa chọn quan hệ / xưởng (không bắt buộc)'}
                  >
                    {(isCompany ? COMPANY_REF_TYPES : PARENT_REF_TYPES).map((t) => {
                      const selected = t.value === form.parentRefType
                      return (
                        <button
                          key={t.value}
                          type="button"
                          role={isCompany ? 'radio' : 'button'}
                          aria-checked={isCompany ? selected : undefined}
                          aria-pressed={!isCompany ? selected : undefined}
                          className={selected ? 'parent-ref-chip is-selected' : 'parent-ref-chip'}
                          disabled={paid}
                          onClick={() => {
                            // Cá nhân: bấm lại chip đang chọn → bỏ chọn (chỉ còn note)
                            if (!isCompany && selected) update('parentRefType', '')
                            else update('parentRefType', t.value)
                          }}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                  {!isCompany && (
                    <input
                      className="parent-ref-name"
                      disabled={paid}
                      maxLength={parentRefNameMaxLength(form.parentRefType || '')}
                      value={form.parentName}
                      onChange={(e) => update('parentName', e.target.value)}
                      placeholder={parentRefPlaceholder(form.parentRefType || '')}
                      aria-invalid={Boolean(fieldErrors.parentName)}
                    />
                  )}
                  {fieldErrors.parentName ? (
                    <span className="field-error" role="alert">
                      {fieldErrors.parentName}
                    </span>
                  ) : !isCompany ? (
                    <span className="field-hint">
                      {form.parentName.length}/{parentRefNameMaxLength(form.parentRefType || '')} — không
                      bắt buộc chọn quan hệ; có thể chỉ ghi chú bên dưới
                    </span>
                  ) : (
                    <span className="field-hint">Chọn chủ công ty hoặc nhân viên công ty</span>
                  )}
                </div>
              )}

              <label className={`field${fieldErrors.pickerName ? ' field-invalid' : ''}`}>
                <span className="field-label">
                  {isCompany ? 'Tên khách hàng lấy' : 'Tên người lấy'} <span className="req">*</span>
                </span>
                <input
                  disabled={paid}
                  maxLength={80}
                  value={form.pickerName}
                  onChange={(e) => update('pickerName', e.target.value)}
                  placeholder={
                    isCompany
                      ? 'Ví dụ: Anh Minh — nhân viên lấy hàng'
                      : 'Ví dụ: Con An mua hộ mẹ'
                  }
                  aria-invalid={Boolean(fieldErrors.pickerName)}
                />
                {fieldErrors.pickerName ? (
                  <span className="field-error" role="alert">
                    {fieldErrors.pickerName}
                  </span>
                ) : (
                  <span className="field-hint">{form.pickerName.length}/80 ký tự</span>
                )}
              </label>

              <div className={`field${fieldErrors.occurredAt ? ' field-invalid' : ''}`}>
                <span className="field-label">
                  Ngày giờ lấy <span className="req">*</span>
                </span>
                <div className="datetime-input-row">
                  <DatePicker
                    {...datePickerViProps}
                    selected={parseDateTimeLocal(form.occurredAt)}
                    onChange={(date) => {
                      acceptValidDateChange(date, (valid) => {
                        occurredDirtyRef.current = false
                        if (keepOccurredErrorRef.current) {
                          keepOccurredErrorRef.current = false
                          setOccurredAt(toDateTimeLocal(valid), { clearError: false })
                          return
                        }
                        setOccurredAt(toDateTimeLocal(valid), { clearError: true })
                      })
                    }}
                    onChangeRaw={onOccurredAtChangeRaw}
                    onFocus={onOccurredAtFocus}
                    onBlur={onOccurredAtBlur}
                    showTimeSelect
                    timeIntervals={1}
                    timeCaption="Giờ"
                    dateFormat="dd/MM/yyyy HH:mm"
                    placeholderText="dd/MM/yyyy HH:mm"
                    disabled={paid}
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                    className={`datepicker-input${fieldErrors.occurredAt ? ' input-invalid' : ''}`}
                  />
                  <button
                    type="button"
                    className="btn-reset-now"
                    disabled={paid}
                    onClick={() => resetOccurredAtToNow('')}
                    title="Đặt lại về thời gian hiện tại"
                  >
                    Hiện tại
                  </button>
                </div>
                {fieldErrors.occurredAt && (
                  <span className="field-error" role="alert">
                    {fieldErrors.occurredAt}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2 className="form-section-title">Số tiền & hàng hóa</h2>
            <div className="form-grid">
              <label className={`field field-amount full${fieldErrors.amount ? ' field-invalid' : ''}`}>
                <span className="field-label">
                  Số tiền nợ <span className="req">*</span>
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  disabled={paid}
                  value={formatMoneyInput(form.amount)}
                  onChange={onAmountChange}
                  placeholder="Ví dụ: 50,000"
                  className={`amount-input${fieldErrors.amount ? ' input-invalid' : ''}`}
                  aria-invalid={Boolean(fieldErrors.amount)}
                />
                {form.amount ? <span className="amount-preview">{formatMoney(form.amount)}</span> : null}
                {fieldErrors.amount && (
                  <span className="field-error" role="alert">
                    {fieldErrors.amount}
                  </span>
                )}
              </label>
              <label className={`field full${fieldErrors.productNote ? ' field-invalid' : ''}`}>
                <span className="field-label">Ghi chú sản phẩm</span>
                <textarea
                  rows={3}
                  disabled={paid}
                  maxLength={200}
                  value={form.productNote}
                  onChange={(e) => update('productNote', e.target.value)}
                  placeholder="Ví dụ: 2 kg gạo, 1 thùng mì"
                  aria-invalid={Boolean(fieldErrors.productNote)}
                />
                {fieldErrors.productNote ? (
                  <span className="field-error" role="alert">
                    {fieldErrors.productNote}
                  </span>
                ) : (
                  <span className="field-hint">{form.productNote.length}/200 ký tự</span>
                )}
              </label>
            </div>
          </div>

          {fieldErrors.form && (
            <p className="error form-error" role="alert">
              {fieldErrors.form}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel btn-lg" onClick={() => navigate(-1)}>
              Hủy
            </button>
            <button type="submit" className="btn-lg" disabled={loading || paid}>
              {loading ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo khoản nợ'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
