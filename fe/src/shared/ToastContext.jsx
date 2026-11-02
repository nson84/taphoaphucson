import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

let toastId = 0

const SUCCESS_COLORS = ['#0000cd', '#f59e0b', '#22c55e', '#3b82f6', '#4169e1', '#14b8a6', '#f97316']
const FAIL_COLORS = ['#00008b', '#0000a8', '#191970', '#6b7280', '#4b5563', '#000080']

function buildBurstParticles(type) {
  const count = type === 'success' ? 28 : 18
  const colors = type === 'success' ? SUCCESS_COLORS : FAIL_COLORS
  return Array.from({ length: count }, (_, i) => {
    const angle = type === 'success' ? (i / count) * 360 + (i % 3) * 7 : 70 + (i / count) * 40
    const dist = type === 'success' ? 90 + (i % 5) * 29 : 64 + (i % 4) * 22
    const rad = (angle * Math.PI) / 180
    const x = Math.cos(rad) * dist
    const y = type === 'success' ? Math.sin(rad) * dist : Math.abs(Math.sin(rad)) * dist + 38
    return {
      id: i,
      x,
      y: type === 'success' ? y : y,
      rot: (i * 47) % 360,
      delay: (i % 6) * 28,
      size: type === 'success' ? 8 + (i % 4) * 2 : 6 + (i % 3) * 2,
      color: colors[i % colors.length],
      shape: type === 'success' ? (i % 3 === 0 ? 'star' : i % 3 === 1 ? 'rect' : 'dot') : i % 2 === 0 ? 'shard' : 'dot',
    }
  })
}

function ToastBurst({ type }) {
  const particles = useMemo(() => buildBurstParticles(type), [type])
  return (
    <span className={`toast-burst toast-burst-${type}`} aria-hidden>
      {particles.map((p) => (
        <span
          key={p.id}
          className={`toast-burst-piece toast-burst-${p.shape}`}
          style={{
            '--tx': `${p.x}px`,
            '--ty': `${p.y}px`,
            '--rot': `${p.rot}deg`,
            '--delay': `${p.delay}ms`,
            '--size': `${p.size}px`,
            '--color': p.color,
          }}
        />
      ))}
    </span>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message, type = 'info', durationMs = 3500) => {
      const id = ++toastId
      const ms = type === 'success' || type === 'error' ? Math.max(durationMs, 4200) : durationMs
      setToasts((prev) => [...prev, { id, message, type }])
      if (ms > 0) {
        window.setTimeout(() => dismiss(id), ms)
      }
      return id
    },
    [dismiss],
  )

  const value = useMemo(
    () => ({
      notify,
      success: (message) => notify(message, 'success'),
      error: (message) => notify(message, 'error'),
      dismiss,
    }),
    [notify, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role="status">
            {(t.type === 'success' || t.type === 'error') && <ToastBurst type={t.type} />}
            <span
              className={`toast-mark toast-mark-${t.type === 'success' || t.type === 'error' ? t.type : 'info'}`}
              aria-hidden
            />
            <span className="toast-message">{t.message}</span>
            <button
              type="button"
              className="toast-close"
              aria-label="Đóng"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast phải dùng trong ToastProvider')
  }
  return ctx
}
