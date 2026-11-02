import { createContext, useContext, useMemo, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../../shared/api'
import { clearCardsUnlock } from '../cards/CardsPinGate'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken())
  const [username, setUsername] = useState(() => localStorage.getItem('taphoa_user') || '')

  function resetLocalSession() {
    clearToken()
    localStorage.removeItem('taphoa_user')
    clearCardsUnlock()
    setTokenState(null)
    setUsername('')
  }

  const value = useMemo(
    () => ({
      token,
      username,
      isAuthenticated: Boolean(token),
      resetLocalSession,
      async login(user, password) {
        const data = await api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ username: user, password }),
        })
        setToken(data.token)
        localStorage.setItem('taphoa_user', data.username)
        setTokenState(data.token)
        setUsername(data.username)
      },
      async logout() {
        try {
          await api('/api/auth/logout', { method: 'POST' })
        } catch {
          /* ignore */
        }
        resetLocalSession()
      },
    }),
    [token, username],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
