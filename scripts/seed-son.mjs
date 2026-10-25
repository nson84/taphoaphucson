const products = [
  'mi tom', 'gao', 'dau an', 'nuoc mam', 'trung',
  'sua', 'banh mi', 'duong', 'muoi', 'xa phong',
  'kem danh rang', 'nuoc ngot', 'bia', 'ca phe', 'mi goi',
  'snack', 'keo', 'thuoc la', 'pin', 'nen',
]
const notes = ['lay thieu tien', 'hen tra cuoi tuan', 'khach quen', '', 'mua them']

const loginRes = await fetch('http://localhost:8080/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'admin', password: 'admin123' }),
})
const login = await loginRes.json()
if (!login.token) {
  console.error('Login failed', login)
  process.exit(1)
}

const headers = {
  Authorization: `Bearer ${login.token}`,
  'Content-Type': 'application/json',
}

let created = 0
for (let i = 1; i <= 20; i++) {
  const day = String(((i - 1) % 28) + 1).padStart(2, '0')
  const hour = String(8 + (i % 10)).padStart(2, '0')
  const min = String((i * 3) % 60).padStart(2, '0')
  const body = {
    customerName: 'sơn',
    customerNote: notes[i % notes.length],
    amount: 5000 + i * 1000,
    productNote: products[i - 1],
    occurredAt: `2026-10-${day}T${hour}:${min}:00`,
  }
  const res = await fetch('http://localhost:8080/api/debts', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    console.error(`FAIL #${i}`, res.status, data)
  } else {
    created++
    console.log(`OK #${i} id=${data.id} amount=${data.amount} product=${data.productNote}`)
  }
}
console.log(`CREATED=${created}`)
