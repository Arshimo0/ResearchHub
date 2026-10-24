const REFRESH_TOKEN_KEY = 'researchhub.refreshToken'

// The access token lives in memory only. It disappears on reload
// and is renewed from the refresh token.
let accessToken: string | null = null

const clearListeners = new Set<() => void>()

export const tokenStore = {
  getAccessToken: () => accessToken,

  getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

  setTokens(access: string, refresh: string) {
    accessToken = access
    localStorage.setItem(REFRESH_TOKEN_KEY, refresh)
  },

  clear() {
    accessToken = null
    localStorage.removeItem(REFRESH_TOKEN_KEY)
    clearListeners.forEach((listener) => listener())
  },

  /** Runs whenever the tokens are cleared, by logout or because the server rejected the session. */
  subscribe(listener: () => void) {
    clearListeners.add(listener)
    return () => {
      clearListeners.delete(listener)
    }
  },
}