const customers = [
  'Nguyễn Văn An',
  'Trần Thị Bình',
  'Lê Minh Cường',
  'Phạm Thu Dung',
  'Hoàng Văn Em',
  'Vũ Thị Hoa',
  'Đặng Quốc Huy',
  'Bùi Thanh Lan',
  'Ngô Đức Mạnh',
  'Đỗ Thị Nga',
  'Lý Văn Phong',
  'Trương Mỹ Quỳnh',
  'Phan Văn Sơn',
  'Võ Thị Tâm',
  'Huỳnh Anh Tuấn',
  'Mai Thị Uyên',
  'Châu Minh Vũ',
  'Tạ Thị Xuân',
  'Lương Văn Yên',
  'Đinh Thị Ánh',
]

const products = [
  'mì tôm', 'gạo', 'dầu ăn', 'nước mắm', 'trứng',
  'sữa', 'bánh mì', 'đường', 'muối', 'xà phòng',
  'kem đánh răng', 'nước ngọt', 'bia', 'cà phê', 'mì gói',
  'snack', 'kẹo', 'thuốc lá', 'pin', 'nến',
]

const notes = [
  'lấy thiếu tiền',
  'hẹn trả cuối tuần',
  'khách quen',
  '',
  'mua thêm',
  'trả dần',
  'gọi nhắc',
]

function pad(n) {
  return String(n).padStart(2, '0')
}

function randomAmount(seed) {
  // 5.000 – 250.000 đ, bước 1.000
  return 5000 + ((seed * 3700) % 246) * 1000
}

function occurredAt(customerIndex, debtIndex) {
  const dayOffset = (customerIndex * 15 + debtIndex) % 90
  const d = new Date(2026, 7, 1) // 2026-08-01
  d.setDate(d.getDate() + dayOffset)
  const hour = 7 + ((customerIndex + debtIndex) % 13)
  const min = (debtIndex * 7 + customerIndex * 3) % 60
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(hour)}:${pad(min)}:00`
}

const loginRes = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})
const login = await loginRes.json()
if (!login.token) {
  console.error('Login failed', login)
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${login.token}`,
  'Content-Type': 'application/json; charset=utf-8',
}

let created = 0
let failed = 0

for (let c = 0; c < customers.length; c++) {
  const name = customers[c]
  const debtCount = 14 + (c % 3) // 14, 15, hoặc 16
  let okForCustomer = 0

  for (let i = 0; i < debtCount; i++) {
    const body = {
      customerName: name,
      customerNote: notes[(c + i) % notes.length],
      amount: randomAmount(c * 100 + i + 1),
      productNote: products[(c + i) % products.length],
      occurredAt: occurredAt(c, i),
    }

    const res = await fetch('http://localhost:8080/api/debts', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      failed++
      console.error(`FAIL ${name} #${i + 1}`, res.status, data)
    } else {
      created++
      okForCustomer++
    }
  }

  console.log(`OK ${name}: ${okForCustomer}/${debtCount} khoản nợ`)
}

console.log(`DONE created=${created} failed=${failed} customers=${customers.length}`)
