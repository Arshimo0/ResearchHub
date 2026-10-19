const REFRESH_TOKEN_KEY = 'researchhub.refreshToken'

// The access token lives in memory only. It disappears on reload
// and is renewed from the refresh token.
let accessToken: string | null = null

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
  },
}