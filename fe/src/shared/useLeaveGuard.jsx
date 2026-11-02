import { useEffect, useRef } from 'react'
import { useBlocker } from 'react-router-dom'
import ConfirmDialog from './ConfirmDialog'

/**
 * Cảnh báo khi đang tạo/sửa dở mà rời trang (đổi route, nút Quay lại, đóng tab).
 * - `dirty`: có thay đổi chưa lưu → chặn và hiện popup.
 * - `allowLeave()`: gọi ngay trước `navigate(...)` sau khi lưu xong để không bị hỏi.
 * Trả về `dialog` (render trong JSX của trang).
 */
export function useLeaveGuard({ dirty, title, message, confirmLabel = 'Thoát', cancelLabel = 'Ở lại' }) {
  const bypassRef = useRef(false)

  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    if (!dirty || bypassRef.current) return false
    return (
      currentLocation.pathname !== nextLocation.pathname ||
      currentLocation.search !== nextLocation.search
    )
  })

  useEffect(() => {
    if (!dirty) return undefined
    const onBeforeUnload = (e) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const dialog = (
    <ConfirmDialog
      open={blocker.state === 'blocked'}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      danger
      onClose={() => blocker.reset?.()}
      onConfirm={() => blocker.proceed?.()}
    />
  )

  return {
    dialog,
    allowLeave: () => {
      bypassRef.current = true
      // chỉ bỏ chặn cho lần điều hướng ngay sau đó (component có thể được dùng lại khi đổi :id)
      setTimeout(() => {
        bypassRef.current = false
      }, 150)
    },
  }
}
