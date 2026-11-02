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

export async function apiUpload(path, formData) {
  return api(path, { method: 'POST', body: formData, headers: {} })
}

export async function api(path, options = {}) {
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData
  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json; charset=utf-8' }),
    ...(options.headers || {}),
  }
  if (isFormData && headers['Content-Type']) {
    delete headers['Content-Type']
  }
  const token = getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  // inlineErrors: lỗi mạng / 5xx chỉ ném lỗi tại chỗ (không điều hướng /error/500) — dùng cho thanh toán,
  // để thu ngân còn thấy giỏ hàng và bấm thử lại (BE chống tạo trùng bằng clientRequestId).
  const { inlineForbidden: _inlineForbidden, inlineErrors, ...fetchOptions } = options
  let res
  try {
    res = await fetch(path, { ...fetchOptions, headers })
  } catch {
    if (!inlineErrors) goErrorPage(500)
    const err = new Error('Không kết nối được máy chủ')
    err.network = true
    throw err
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

  if (res.status === 401) {
    clearToken()
    if (!path.includes('/api/auth/login')) {
      goErrorPage(401)
    }
    throw new Error(data?.message || 'Unauthorized')
  }

  if (res.status === 403 && !options.inlineForbidden) {
    // 403 không có body JSON (token hết hạn / chưa đăng nhập) → đăng nhập lại
    if (!data?.message) {
      clearToken()
      goErrorPage(401)
      throw new Error('Unauthorized')
    }
    goErrorPage(403)
    throw new Error(data.message)
  }

  if (res.status >= 500) {
    if (!inlineErrors) goErrorPage(500)
    const err = new Error(inlineErrors ? data?.message || 'Lỗi máy chủ' : 'Server error')
    err.serverError = true
    throw err
  }

  if (!res.ok) {
    // 404 API (vd. không tìm thấy khoản nợ) giữ thông báo tại chỗ; 404 URL dùng route *
    throw new Error(data?.message || 'Có lỗi xảy ra')
  }
  return data
}
