/**
 * Tìm đơn vị tính hiện tại của hàng ứng với dòng giỏ POS.
 *
 * Sửa hàng làm tạo lại đơn vị (id mới), nên khớp theo id trước, rồi theo tên + hệ số.
 * Không tìm thấy thì báo lỗi — KHÔNG tự hạ về đơn vị cơ bản (sẽ tính giá thùng nhưng trừ tồn 1 gói).
 *
 * @param {{units?: Array<{id:number,name:string,factor?:number,base?:boolean}>, name?: string}} product hàng vừa tải từ API
 * @param {{unitId?: number|null, unitName?: string, unitFactor?: number, name?: string}} line dòng giỏ
 * @returns {number|null} id đơn vị cần gửi lên API (null = hàng cũ không có bảng đơn vị)
 */
export function resolveSaleUnitId(product, line) {
  const units = Array.isArray(product?.units) ? product.units : []
  if (units.length === 0) return null

  if (line.unitId == null) {
    return (units.find((u) => u.base) || units[0]).id ?? null
  }

  const byId = units.find((u) => String(u.id) === String(line.unitId))
  if (byId) return byId.id

  if (line.unitName) {
    const factor = Number(line.unitFactor) || 1
    const byName = units.find(
      (u) => u.name === line.unitName && (Number(u.factor) || 1) === factor,
    )
    if (byName) return byName.id
  }

  const label = line.name || product?.name || 'hàng'
  throw new Error(
    `Đơn vị tính của «${label}» đã thay đổi. Hãy xóa dòng và thêm lại hàng vào hóa đơn.`,
  )
}
