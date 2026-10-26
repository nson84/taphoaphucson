/** In hóa đơn: app desktop in im (không hộp thoại); trình duyệt vẫn dùng window.print(). */
export async function printReceipt() {
  const desktop = typeof window !== 'undefined' ? window.taphoaDesktop : null
  if (desktop?.canSilentPrint && typeof desktop.printSilent === 'function') {
    const result = await desktop.printSilent()
    if (!result?.success) {
      throw new Error(result?.failureReason || 'In thất bại')
    }
    return { silent: true, deviceName: result.deviceName || '' }
  }
  window.print()
  return { silent: false }
}
