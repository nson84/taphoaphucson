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

function goErrorPage(code) {
  const path = `/error/${code}`
  if (typeof window === 'undefined') return
  if (window.location.pathname === path) return
  window.location.assign(path)
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

  let res
  try {
    res = await fetch(path, { ...options, headers })
  } catch {
    goErrorPage(500)
    throw new Error('Không kết nối được máy chủ')
  }

  if (res.status === 401) {
    clearToken()
    if (!path.includes('/api/auth/login')) {
      goErrorPage(401)
    }
    throw new Error('Unauthorized')
  }

  if (res.status === 403) {
    goErrorPage(403)
    throw new Error('Forbidden')
  }

  if (res.status >= 500) {
    goErrorPage(500)
    throw new Error('Server error')
  }

  if (res.status === 204) {
    return null
  }

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    // 404 API (vd. không tìm thấy khoản nợ) giữ thông báo tại chỗ; 404 URL dùng route *
    throw new Error(data?.message || 'Có lỗi xảy ra')
  }
  return data
}
