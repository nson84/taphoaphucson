import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getToken } from './api'

/** Thumbnail sản phẩm / kiểu dáng: fetch ảnh có JWT; không có ảnh → placeholder thống nhất. */
export default function ProductThumb({
  productId,
  hasImage,
  /** Nếu có: lấy ảnh kiểu dáng `/variants/{id}/image` thay ảnh sản phẩm. */
  variantId = null,
  alt = '',
  className = '',
  /** Hover phóng nhẹ + bấm xem ảnh lớn. Tắt khi không cần (vd. form đang chọn file). */
  zoomable = true,
}) {
  const [src, setSrc] = useState(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!hasImage || !productId) {
      setSrc(null)
      return undefined
    }
    let alive = true
    let objectUrl
    ;(async () => {
      try {
        const token = getToken()
        const path = variantId
          ? `/api/products/${productId}/variants/${variantId}/image`
          : `/api/products/${productId}/image`
        const res = await fetch(path, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) return
        const blob = await res.blob()
        objectUrl = URL.createObjectURL(blob)
        if (alive) setSrc(objectUrl)
      } catch {
        // giữ placeholder
      }
    })()
    return () => {
      alive = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [productId, hasImage, variantId])

  useEffect(() => {
    if (!open) return undefined
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (!src) {
    return (
      <div
        className={`product-thumb product-thumb--ph ${className}`.trim()}
        aria-hidden
        title="Chưa có ảnh"
      />
    )
  }

  const canZoom = zoomable

  function openPreview(e) {
    if (!canZoom) return
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <span
        className={`product-thumb-wrap${canZoom ? ' is-zoomable' : ''}`}
        onClick={openPreview}
        onKeyDown={(e) => {
          if (!canZoom) return
          if (e.key === 'Enter' || e.key === ' ') openPreview(e)
        }}
        role={canZoom ? 'button' : undefined}
        tabIndex={canZoom ? 0 : undefined}
        aria-label={canZoom ? (alt ? `Xem ảnh ${alt}` : 'Xem ảnh sản phẩm') : undefined}
        title={canZoom ? 'Bấm để xem ảnh lớn' : undefined}
      >
        <img className={`product-thumb ${className}`.trim()} src={src} alt={alt} draggable={false} />
      </span>
      {open &&
        createPortal(
          <div
            className="product-image-lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={alt ? `Ảnh ${alt}` : 'Ảnh sản phẩm'}
            onClick={() => setOpen(false)}
          >
            <button
              type="button"
              className="product-image-lightbox-close btn-cancel"
              onClick={() => setOpen(false)}
            >
              Đóng
            </button>
            <img
              className="product-image-lightbox-img"
              src={src}
              alt={alt}
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )}
    </>
  )
}
