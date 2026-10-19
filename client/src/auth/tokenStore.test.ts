import { beforeEach, describe, expect, it } from 'vitest'
import { tokenStore } from './tokenStore'

describe('tokenStore', () => {
  beforeEach(() => {
    localStorage.clear()
    tokenStore.clear()
  })

  it('keeps the access token in memory and only the refresh token in localStorage', () => {
    tokenStore.setTokens('access-token', 'refresh-token')

    expect(tokenStore.getAccessToken()).toBe('access-token')
    expect(tokenStore.getRefreshToken()).toBe('refresh-token')

    const stored = Object.keys(localStorage).map((key) => localStorage.getItem(key))
    expect(stored).toContain('refresh-token')
    expect(stored).not.toContain('access-token')
  })

  it('clear removes both tokens', () => {
    tokenStore.setTokens('access-token', 'refresh-token')

    tokenStore.clear()

    expect(tokenStore.getAccessToken()).toBeNull()
    expect(tokenStore.getRefreshToken()).toBeNull()
  })
})