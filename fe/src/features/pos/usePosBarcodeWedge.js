import { useEffect, useRef } from 'react'

/** Khoảng nghỉ giữa 2 phím → coi là mã mới (máy quét gửi rất nhanh). */
const WEDGE_GAP_MS = 80

/**
 * Máy quét đôi khi không gửi Enter — sau khi buffer ổn định đủ dài như mã vạch thì tự commit.
 * Lớn hơn WEDGE_GAP một chút để không cắt giữa chuỗi quét chậm.
 */
const WEDGE_IDLE_COMMIT_MS = 140

function looksLikeCompleteBarcode(raw) {
  const s = String(raw || '').trim()
  if (!s) return false
  return /^[0-9]{8,14}$/.test(s) || (/^[A-Za-z0-9._-]{4,64}$/.test(s) && !/\s/.test(s))
}

/** Máy quét USB (keyboard wedge): bắt phím khi không đang gõ ô khác trên POS. */
export function shouldCapturePosBarcode(searchInput) {
  const el = document.activeElement
  if (!el || el === document.body) return true
  if (el === searchInput) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false
  if (el.isContentEditable) return false
  return true
}

/**
 * @param {object} opts
 * @param {import('react').RefObject<HTMLInputElement|null>} opts.searchRef
 * @param {(code: string) => void|Promise<void>} opts.onEnter
 * @param {(partial: string) => void} opts.onInput
 */
export function usePosBarcodeWedge({ searchRef, onEnter, onInput }) {
  const bufferRef = useRef('')
  const lastKeyAtRef = useRef(0)
  const idleTimerRef = useRef(0)
  const onEnterRef = useRef(onEnter)
  const onInputRef = useRef(onInput)
  onEnterRef.current = onEnter
  onInputRef.current = onInput

  function clearIdleTimer() {
    if (idleTimerRef.current) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = 0
    }
  }

  function clearBuffer() {
    bufferRef.current = ''
    lastKeyAtRef.current = 0
    clearIdleTimer()
  }

  function commitBuffer() {
    const code = bufferRef.current.trim()
    bufferRef.current = ''
    lastKeyAtRef.current = 0
    clearIdleTimer()
    if (!code) return
    void onEnterRef.current(code)
  }

  function scheduleIdleCommit() {
    clearIdleTimer()
    if (!looksLikeCompleteBarcode(bufferRef.current)) return
    idleTimerRef.current = window.setTimeout(() => {
      idleTimerRef.current = 0
      if (!looksLikeCompleteBarcode(bufferRef.current)) return
      commitBuffer()
    }, WEDGE_IDLE_COMMIT_MS)
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.repeat) return
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (!shouldCapturePosBarcode(searchRef.current)) return

      if (e.key === 'Enter') {
        const code = bufferRef.current.trim()
        bufferRef.current = ''
        lastKeyAtRef.current = 0
        clearIdleTimer()
        if (!code) return
        e.preventDefault()
        e.stopPropagation()
        void onEnterRef.current(code)
        return
      }

      if (e.key.length === 1) {
        const now = Date.now()
        if (now - lastKeyAtRef.current > WEDGE_GAP_MS) {
          bufferRef.current = ''
        }
        lastKeyAtRef.current = now
        bufferRef.current += e.key
        e.preventDefault()
        e.stopPropagation()
        onInputRef.current(bufferRef.current)
        scheduleIdleCommit()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      clearIdleTimer()
    }
  }, [searchRef])

  return { clearBuffer }
}
