import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { History } from 'lucide-react'
import DatePicker from 'react-datepicker'
import { api } from '../../shared/api'
import { formatMoney } from '../../shared/format'
import { useToast } from '../../shared/ToastContext'
import {
  acceptValidDateChange,
  datePickerViProps,
  parseStrictDisplayDate,
  parseYm,
  parseYmd,
  toYm,
  toYmd,
} from '../../shared/viDatePicker'

const GROUP = {
  DAY: 'day',
  MONTH: 'month',
  YEAR: 'year',
}

const GROUP_OPTIONS = [
  { value: GROUP.DAY, label: 'Theo ngày' },
  { value: GROUP.MONTH, label: 'Theo tháng' },
  { value: GROUP.YEAR, label: 'Theo năm' },
]

const DAY_FORMAT = 'dd/MM/yyyy'
const MONTH_FORMAT = "'Tháng' M/yyyy"

function vnNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }))
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function todayStr() {
  const d = vnNow()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function currentMonthStr() {
  const d = vnNow()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}

function currentYearStr() {
  return String(vnNow().getFullYear())
}

function monthStart(ym) {
  return `${ym}-01`
}

function monthEnd(ym) {
  const [y, m] = ym.split('-').map(Number)
  const last = new Date(y, m, 0).getDate()
  return `${y}-${pad(m)}-${pad(last)}`
}

/**
 * Mốc «Đến» khi xem theo tháng:
 * - tháng hiện tại → đến hôm nay (không lấy ngày tương lai trong tháng)
 * - tháng đã qua → hết tháng
 * - tháng tương lai → hôm nay (khoảng rỗng / không có doanh thu)
 */
function monthRangeTo(ym) {
  const today = todayStr()
  const cur = currentMonthStr()
  if (ym === cur) return today
  if (ym < cur) return monthEnd(ym)
  return today
}

function yearStart(y) {
  return `${y}-01-01`
}

function yearEnd(y) {
  return `${y}-12-31`
}

/** Năm hiện tại: đến hôm nay; năm đã qua: 31/12. */
function yearRangeTo(y) {
  const today = todayStr()
  const cur = currentYearStr()
  if (String(y) === cur) return today
  if (String(y) < cur) return yearEnd(y)
  return today
}

/** Gom byDay → tháng (YYYY-MM) hoặc năm (YYYY). */
function aggregateRows(byDay, group) {
  const rows = byDay || []
  if (group === GROUP.DAY) {
    return rows.map((r) => ({
      key: r.date,
      label: r.date,
      revenue: Number(r.revenue) || 0,
      cost: Number(r.cost) || 0,
      profit: Number(r.profit) || 0,
      saleCount: Number(r.saleCount) || 0,
    }))
  }
  const map = new Map()
  for (const r of rows) {
    const key = group === GROUP.MONTH ? String(r.date).slice(0, 7) : String(r.date).slice(0, 4)
    if (!key) continue
    const prev = map.get(key) || {
      key,
      label: key,
      revenue: 0,
      cost: 0,
      profit: 0,
      saleCount: 0,
    }
    prev.revenue += Number(r.revenue) || 0
    prev.cost += Number(r.cost) || 0
    prev.saleCount += Number(r.saleCount) || 0
    prev.profit = prev.revenue - prev.cost
    map.set(key, prev)
  }
  return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key))
}

function formatPeriodLabel(key, group) {
  if (group === GROUP.DAY) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
    return m ? `${m[3]}/${m[2]}/${m[1]}` : key
  }
  if (group === GROUP.MONTH) {
    const m = /^(\d{4})-(\d{2})$/.exec(key)
    return m ? `Tháng ${Number(m[2])}/${m[1]}` : key
  }
  return `Năm ${key}`
}

/**
 * Ô DatePicker: ngày/tháng không tồn tại → notification + trả về giá trị trước đó (không hiện text dưới ô).
 */
function ReportDateField({ label, selectedYmdOrYm, onValidYmdOrYm, mode, onInvalid, inputKey }) {
  const isMonth = mode === 'month'
  const formatStr = isMonth ? MONTH_FORMAT : DAY_FORMAT
  const focusDisplayRef = useRef('')
  const rawRef = useRef('')
  const dirtyRef = useRef(false)

  const selected = isMonth ? parseYm(selectedYmdOrYm) : parseYmd(selectedYmdOrYm)

  function onFocus(e) {
    const shown = e?.target && typeof e.target.value === 'string' ? e.target.value : ''
    focusDisplayRef.current = shown
    rawRef.current = shown
    dirtyRef.current = false
  }

  function onChangeRaw(e) {
    if (e?.target && typeof e.target.value === 'string') {
      rawRef.current = e.target.value
      dirtyRef.current = e.target.value.trim() !== focusDisplayRef.current.trim()
    }
  }

  function onBlur() {
    if (!dirtyRef.current) {
      rawRef.current = ''
      return
    }
    dirtyRef.current = false
    const raw = (rawRef.current || '').trim()
    rawRef.current = ''
    if (!raw || raw === focusDisplayRef.current.trim()) return

    const parsed = parseStrictDisplayDate(raw, formatStr)
    if (!parsed) {
      onInvalid(
        isMonth
          ? 'Tháng không hợp lệ — đã trả về tháng trước đó'
          : 'Ngày không tồn tại — đã trả về ngày trước đó',
      )
      return
    }
    onValidYmdOrYm(isMonth ? toYm(parsed) : toYmd(parsed))
  }

  return (
    <label className="sale-report-filter">
      <span className="sale-report-filter-label">{label}</span>
      <DatePicker
        key={inputKey}
        {...datePickerViProps}
        selected={selected}
        onChange={(date) => {
          if (!date || Number.isNaN(date.getTime())) return
          acceptValidDateChange(date, (valid) => {
            dirtyRef.current = false
            onValidYmdOrYm(isMonth ? toYm(valid) : toYmd(valid))
          })
        }}
        onChangeRaw={onChangeRaw}
        onFocus={onFocus}
        onBlur={onBlur}
        showMonthYearPicker={isMonth}
        dateFormat={formatStr}
        className="datepicker-input sale-report-datepicker"
        placeholderText={isMonth ? 'Tháng M/yyyy' : 'dd/MM/yyyy'}
      />
    </label>
  )
}

export default function SaleReportPage() {
  const toast = useToast()
  const [group, setGroup] = useState(GROUP.DAY)
  const [fromDay, setFromDay] = useState(todayStr)
  const [toDay, setToDay] = useState(todayStr)
  /** Theo tháng / năm: chọn đúng 1 kỳ (không khoảng từ–đến). */
  const [month, setMonth] = useState(currentMonthStr)
  const [year, setYear] = useState(currentYearStr)
  const [report, setReport] = useState(null)
  const [pickerKeys, setPickerKeys] = useState({ fromDay: 0, toDay: 0, month: 0 })
  const swapToastLock = useRef(false)

  const from =
    group === GROUP.MONTH
      ? monthStart(month)
      : group === GROUP.YEAR
        ? yearStart(year)
        : fromDay
  const to =
    group === GROUP.MONTH
      ? monthRangeTo(month)
      : group === GROUP.YEAR
        ? yearRangeTo(year)
        : toDay

  /** Theo ngày: Từ > Đến → đổi chỗ hai ô. */
  useEffect(() => {
    if (group === GROUP.DAY && fromDay > toDay) {
      setFromDay(toDay)
      setToDay(fromDay)
      if (!swapToastLock.current) {
        swapToastLock.current = true
        toast.notify('Đã đổi chỗ: «Từ» phải nhỏ hơn hoặc bằng «Đến»', 'info')
        window.setTimeout(() => {
          swapToastLock.current = false
        }, 400)
      }
    }
  }, [group, fromDay, toDay, toast])

  useEffect(() => {
    if (from > to) return
    api(`/api/sales/report?from=${from}&to=${to}`)
      .then(setReport)
      .catch((e) => {
        setReport(null)
        toast.error(e.message || 'Không tải được báo cáo')
      })
  }, [from, to, toast])

  const rows = useMemo(() => aggregateRows(report?.byDay, group), [report, group])

  const periodCol =
    group === GROUP.DAY ? 'Ngày' : group === GROUP.MONTH ? 'Tháng' : 'Năm'
  const sectionTitle =
    group === GROUP.DAY ? 'Theo ngày' : group === GROUP.MONTH ? 'Theo tháng' : 'Theo năm'
  const yearOptions = useMemo(() => {
    const now = Number(currentYearStr())
    const list = []
    for (let y = now; y >= now - 10; y -= 1) list.push(String(y))
    return list
  }, [])

  function handleInvalid(fieldKey) {
    return (message) => {
      toast.error(message)
      setPickerKeys((prev) => ({ ...prev, [fieldKey]: (prev[fieldKey] || 0) + 1 }))
    }
  }

  return (
    <section className="panel sale-report-page">
      <div className="panel-head sale-report-head">
        <div>
          <h1 className="sale-report-title">Báo cáo bán hàng</h1>
          <p className="sale-report-sub muted">
            Doanh thu, vốn và lãi — xem theo ngày, tháng hoặc năm.
          </p>
        </div>
        <div className="panel-actions">
          <Link className="btn btn-info" to="/sales">
            <History size={16} strokeWidth={2.25} aria-hidden />
            Lịch sử
          </Link>
        </div>
      </div>

      <div className="sale-report-filters">
        <div className="filter-kind-group sale-report-group" role="radiogroup" aria-label="Cách xem">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={group === opt.value}
              className={`filter-kind-btn${group === opt.value ? ' is-active' : ''}`}
              onClick={() => {
                setGroup(opt.value)
                if (opt.value === GROUP.MONTH) setMonth(currentMonthStr())
                if (opt.value === GROUP.YEAR) setYear(currentYearStr())
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {group === GROUP.DAY && (
          <>
            <ReportDateField
              label="Từ"
              mode="day"
              selectedYmdOrYm={fromDay}
              onValidYmdOrYm={setFromDay}
              onInvalid={handleInvalid('fromDay')}
              inputKey={`fromDay-${pickerKeys.fromDay}`}
            />
            <ReportDateField
              label="Đến"
              mode="day"
              selectedYmdOrYm={toDay}
              onValidYmdOrYm={setToDay}
              onInvalid={handleInvalid('toDay')}
              inputKey={`toDay-${pickerKeys.toDay}`}
            />
          </>
        )}

        {group === GROUP.MONTH && (
          <ReportDateField
            label="Tháng"
            mode="month"
            selectedYmdOrYm={month}
            onValidYmdOrYm={setMonth}
            onInvalid={handleInvalid('month')}
            inputKey={`month-${pickerKeys.month}`}
          />
        )}

        {group === GROUP.YEAR && (
          <label className="sale-report-filter">
            <span className="sale-report-filter-label">Năm</span>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {report && (
        <>
          <div className="summary-kpi sale-report-kpi">
            <div className="summary-kpi-card sale-report-kpi-card">
              <span className="summary-kpi-label">Doanh thu</span>
              <strong className="summary-kpi-value sale-report-kpi-accent">
                {formatMoney(report.revenue)}
              </strong>
            </div>
            <div className="summary-kpi-card sale-report-kpi-card">
              <span className="summary-kpi-label">Vốn</span>
              <strong className="summary-kpi-value">{formatMoney(report.cost)}</strong>
            </div>
            <div className="summary-kpi-card sale-report-kpi-card sale-report-kpi-card--highlight">
              <span className="summary-kpi-label">Lãi ước tính</span>
              <strong className="summary-kpi-value sale-report-kpi-accent">
                {formatMoney(report.profit)}
              </strong>
            </div>
            <div className="summary-kpi-card sale-report-kpi-card">
              <span className="summary-kpi-label">Số đơn</span>
              <strong className="summary-kpi-value">{report.saleCount}</strong>
            </div>
          </div>

          <h2 className="sale-report-section-title">{sectionTitle}</h2>
          <div className="accent-table-wrap sale-report-table-wrap">
            <table className="accent-data-table sale-report-table">
              <thead>
                <tr>
                  <th>{periodCol}</th>
                  <th>Doanh thu</th>
                  <th>Vốn</th>
                  <th>Lãi</th>
                  <th>Đơn</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="sale-report-td-date">{formatPeriodLabel(r.key, group)}</td>
                    <td className="sale-report-td-money">{formatMoney(r.revenue)}</td>
                    <td className="sale-report-td-money">{formatMoney(r.cost)}</td>
                    <td className="sale-report-td-money sale-report-td-profit">
                      {formatMoney(r.profit)}
                    </td>
                    <td className="sale-report-td-count">{r.saleCount}</td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr className="sale-report-empty-row">
                    <td colSpan={5}>Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
