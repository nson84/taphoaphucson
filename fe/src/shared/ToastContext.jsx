import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)

let toastId = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback(
    (message, type = 'info', durationMs = 3500) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message, type }])
      if (durationMs > 0) {
        window.setTimeout(() => dismiss(id), durationMs)
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
