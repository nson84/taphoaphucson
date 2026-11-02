/** Khổ in nhiệt (micron): 1mm = 1000 micron. */
const RECEIPT_WIDTH_MM = 58
const RECEIPT_CSS_WIDTH_MM = 56

/**
 * Đo chiều cao thực của .receipt → pageSize cho máy in nhiệt.
 * Tắt zoom xem trước khi đo (tránh Electron cắt giấy theo viewport / A4).
 */
export function measureReceiptPageSize() {
  const el =
    document.querySelector('.print-preview-body .receipt') ||
    document.querySelector('.receipt')
  if (!el) {
    return { width: RECEIPT_WIDTH_MM * 1000, height: 80 * 1000 }
  }

  const prevZoom = el.style.zoom
  el.style.zoom = '1'
  // Ép reflow sau khi bỏ zoom xem trước
  void el.offsetHeight
  const widthPx = Math.max(el.scrollWidth, el.offsetWidth, 1)
  const heightPx = Math.max(el.scrollHeight, el.offsetHeight, 1)
  el.style.zoom = prevZoom

  const heightMm = (heightPx / widthPx) * RECEIPT_CSS_WIDTH_MM
  const padMm = 4

  return {
    width: RECEIPT_WIDTH_MM * 1000,
    height: Math.max(Math.ceil((heightMm + padMm) * 1000), 28 * 1000),
  }
}

function waitPaint() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve))
  })
}

/** In hóa đơn: app desktop in im (không hộp thoại); trình duyệt vẫn dùng window.print(). */
export async function printReceipt() {
  await waitPaint()
  const pageSize = measureReceiptPageSize()
  const desktop = typeof window !== 'undefined' ? window.taphoaDesktop : null
  if (desktop?.canSilentPrint && typeof desktop.printSilent === 'function') {
    const result = await desktop.printSilent({ pageSize })
    if (!result?.success) {
      throw new Error(result?.failureReason || 'In thất bại')
    }
    return { silent: true, deviceName: result.deviceName || '', pageSize }
  }
  window.print()
  return { silent: false, pageSize }
}
