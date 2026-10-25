const login = await (
  await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' }),
  })
).json()

const h = {
  Authorization: `Bearer ${login.token}`,
  'Content-Type': 'application/json',
}

const debts = await (await fetch('http://localhost:8080/api/debts?page=0&size=20', { headers: h })).json()
let target = debts.content.find((d) => d.paid)
if (!target) {
  target = debts.content.find((d) => !d.paid)
  await fetch(`http://localhost:8080/api/debts/${target.id}/pay`, { method: 'POST', headers: h })
}

const bad = await fetch(`http://localhost:8080/api/debts/${target.id}/unpay`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ pin: '000000' }),
})
console.log('bad', bad.status, await bad.text())

const good = await fetch(`http://localhost:8080/api/debts/${target.id}/unpay`, {
  method: 'POST',
  headers: h,
  body: JSON.stringify({ pin: '123456' }),
})
console.log('good', good.status, await good.text())
