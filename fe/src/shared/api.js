const TOKEN_KEY = 'taphoa_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function api(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(path, { ...options, headers })
  if (res.status === 401) {
    clearToken()
    if (!path.includes('/api/auth/login')) {
      window.location.href = '/login'
    }
    throw new Error('Unauthorized')
  }

  if (res.status === 204) {
    return null
  }

  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(data?.message || 'Có lỗi xảy ra')
  }
  return data
}
