const loginRes = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})
const { token } = await loginRes.json()
const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json; charset=utf-8',
}

const fixes = {
  'd?u an': 'dầu ăn',
  'tr?ng': 'trứng',
  's?a': 'sữa',
  'du?ng': 'đường',
  'nu?c ng?t': 'nước ngọt',
  'k?o': 'kẹo',
  'n?n': 'nến',
  'mi tom': 'mì tôm',
  gao: 'gạo',
  'dau an': 'dầu ăn',
  'nuoc mam': 'nước mắm',
  trung: 'trứng',
  sua: 'sữa',
  'banh mi': 'bánh mì',
  duong: 'đường',
  muoi: 'muối',
  'xa phong': 'xà phòng',
  'kem danh rang': 'kem đánh răng',
  'nuoc ngot': 'nước ngọt',
  'ca phe': 'cà phê',
  'mi goi': 'mì gói',
  keo: 'kẹo',
  'thuoc la': 'thuốc lá',
  nen: 'nến',
}

const noteFixes = {
  'tr? d?n': 'trả dần',
  'h?n tr? cu?i tu?n': 'hẹn trả cuối tuần',
  'lay thieu tien': 'lấy thiếu tiền',
  'hen tra cuoi tuan': 'hẹn trả cuối tuần',
  'khach quen': 'khách quen',
  'mua them': 'mua thêm',
}

let page = 0
let updated = 0
while (true) {
  const res = await fetch(`http://localhost:8080/api/debts?q=&page=${page}&size=50`, { headers })
  const data = await res.json()
  if (!data.content?.length) break

  for (const d of data.content) {
    const productNote = fixes[d.productNote] ?? d.productNote
    const customerNote = noteFixes[d.customerNote] ?? d.customerNote
    if (productNote === d.productNote && customerNote === d.customerNote) continue
    if (d.paid) continue

    const put = await fetch(`http://localhost:8080/api/debts/${d.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        customerName: d.customerName,
        customerNote,
        amount: d.amount,
        productNote,
        occurredAt: d.occurredAt?.length === 19 ? d.occurredAt : `${d.occurredAt}:00`,
      }),
    })
    if (put.ok) {
      updated++
      console.log(`OK id=${d.id}: ${d.productNote} -> ${productNote}`)
    } else {
      console.error(`FAIL id=${d.id}`, await put.text())
    }
  }

  if (page + 1 >= data.totalPages) break
  page++
}

console.log(`UPDATED=${updated}`)
