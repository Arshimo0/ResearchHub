import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { request } from '../api/client'
import type { AuthResult, LoginRequest, RegisterRequest, User } from '../api/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'
import { tokenStore } from './tokenStore'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.getRefreshToken() ? 'loading' : 'anonymous',
  )

  // A stored refresh token means "maybe still signed in". Asking who we are
  // lets the API client refresh the session automatically if it has to.
  useEffect(() => {
    if (!tokenStore.getRefreshToken()) return

    let cancelled = false

    request<User>('/api/users/me')
      .then((me) => {
        if (cancelled) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!cancelled) setStatus('anonymous')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const applyAuth = useCallback((auth: AuthResult) => {
    tokenStore.setTokens(auth.accessToken, auth.refreshToken)
    setUser(auth.user)
    setStatus('authenticated')
  }, [])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      applyAuth(
        await request<AuthResult>('/api/auth/login', { method: 'POST', body: credentials, auth: false }),
      )
    },
    [applyAuth],
  )

  const register = useCallback(
    async (details: RegisterRequest) => {
      applyAuth(
        await request<AuthResult>('/api/auth/register', { method: 'POST', body: details, auth: false }),
      )
    },
    [applyAuth],
  )

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, register, logout }),
    [status, user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}