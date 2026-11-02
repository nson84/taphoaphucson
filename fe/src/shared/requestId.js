/** Khóa chống trùng cho một lần thanh toán (gửi lại cùng khóa → BE trả hóa đơn đã tạo). */
export function newRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const rand = () => Math.random().toString(16).slice(2, 10)
  return `${Date.now().toString(16)}-${rand()}-${rand()}`
}

/**
 * Giữ cùng một id khi gửi lại đúng payload đó (sau lỗi mạng); đổi payload hoặc gọi {@link reset}
 * (sau khi thành công) thì sinh id mới — tránh hai lần bán giống hệt nhau bị coi là một.
 */
export function createRequestIdHolder() {
  let sig = ''
  let id = ''
  return {
    idFor(payload) {
      const next = JSON.stringify(payload)
      if (next !== sig || !id) {
        sig = next
        id = newRequestId()
      }
      return id
    },
    reset() {
      sig = ''
      id = ''
    },
  }
}
