import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tokenStore } from '../auth/tokenStore'
import { ApiError, request } from './client'
import type { AuthResult } from './types'

const fetchMock = vi.fn()

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const unauthorized = () => json({ title: 'Unauthorized', status: 401 }, 401)

const authResult = (access: string, refresh: string): AuthResult => ({
  accessToken: access,
  refreshToken: refresh,
  accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  user: { id: 'u1', email: 'ana@example.com', displayName: 'Ana', role: 'User' },
})

const urlOf = (call: unknown[]) => String(call[0])
const initOf = (call: unknown[]) => (call[1] ?? {}) as RequestInit
const headersOf = (call: unknown[]) => (initOf(call).headers ?? {}) as Record<string, string>

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }
  throw new Error('Expected the request to fail')
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  tokenStore.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('sends the bearer token and a JSON body', async () => {
    tokenStore.setTokens('access-1', 'refresh-1')
    fetchMock.mockResolvedValueOnce(json({ id: 'p1' }))

    const result = await request<{ id: string }>('/api/projects', {
      method: 'POST',
      body: { name: 'AI' },
    })

    expect(result).toEqual({ id: 'p1' })
    const call = fetchMock.mock.calls[0]
    expect(urlOf(call)).toBe('http://api.test/api/projects')
    expect(headersOf(call).Authorization).toBe('Bearer access-1')
    expect(headersOf(call)['Content-Type']).toBe('application/json')
    expect(initOf(call).body).toBe(JSON.stringify({ name: 'AI' }))
  })

  it('omits the token when auth is false', async () => {
    tokenStore.setTokens('access-1', 'refresh-1')
    fetchMock.mockResolvedValueOnce(json({ status: 'Healthy' }))

    await request('/api/health', { auth: false })

    expect(headersOf(fetchMock.mock.calls[0]).Authorization).toBeUndefined()
  })

  it('returns undefined for a 204 response', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    const result = await request('/api/projects/p1', { method: 'DELETE' })

    expect(result).toBeUndefined()
  })

  it('exposes per-field validation errors', async () => {
    fetchMock.mockResolvedValueOnce(
      json(
        {
          title: 'Validation failed',
          status: 400,
          errors: { password: ['Password must be at least 8 characters.'] },
        },
        400,
      ),
    )

    const error = await failure(request('/api/auth/register', { method: 'POST', body: {}, auth: false }))

    expect(error.status).toBe(400)
    expect(error.fieldErrors.password).toEqual(['Password must be at least 8 characters.'])
  })

  it('falls back to a generic message when the error body is not JSON', async () => {
    fetchMock.mockResolvedValueOnce(new Response('upstream exploded', { status: 500 }))

    const error = await failure(request('/api/projects'))

    expect(error.status).toBe(500)
    expect(error.message).toBe('Request failed (500)')
    expect(error.problem).toBeNull()
  })

  it('reports an unreachable server as status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const error = await failure(request('/api/projects'))

    expect(error.status).toBe(0)
    expect(error.message).toContain('Cannot reach the server')
  })
})

describe('session refresh', () => {
  it('refreshes once on a 401 and retries with the new token', async () => {
    tokenStore.setTokens('old-access', 'old-refresh')
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(authResult('new-access', 'new-refresh')))
      .mockResolvedValueOnce(json({ ok: true }))

    const result = await request<{ ok: boolean }>('/api/projects')

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(urlOf(fetchMock.mock.calls[1])).toBe('http://api.test/api/auth/refresh')
    expect(initOf(fetchMock.mock.calls[1]).body).toBe(JSON.stringify({ refreshToken: 'old-refresh' }))
    expect(headersOf(fetchMock.mock.calls[2]).Authorization).toBe('Bearer new-access')
    expect(tokenStore.getAccessToken()).toBe('new-access')
    expect(tokenStore.getRefreshToken()).toBe('new-refresh')
  })

  it('restores the session after a page reload', async () => {
    // After a reload only the refresh token survives, so there is no access token.
    localStorage.setItem('researchhub.refreshToken', 'stored-refresh')
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json(authResult('fresh-access', 'fresh-refresh')))
      .mockResolvedValueOnce(json({ ok: true }))

    await request('/api/projects')

    expect(headersOf(fetchMock.mock.calls[0]).Authorization).toBeUndefined()
    expect(initOf(fetchMock.mock.calls[1]).body).toBe(JSON.stringify({ refreshToken: 'stored-refresh' }))
    expect(headersOf(fetchMock.mock.calls[2]).Authorization).toBe('Bearer fresh-access')
  })

  it('does not call the refresh endpoint when there is no refresh token', async () => {
    fetchMock.mockResolvedValueOnce(unauthorized())

    const error = await failure(request('/api/projects'))

    expect(error.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('clears the session when the refresh token is rejected', async () => {
    tokenStore.setTokens('access', 'refresh')
    fetchMock.mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(unauthorized())

    const error = await failure(request('/api/projects'))

    expect(error.status).toBe(401)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(tokenStore.getAccessToken()).toBeNull()
    expect(tokenStore.getRefreshToken()).toBeNull()
  })

  it('keeps the session when the refresh endpoint has a server error', async () => {
    tokenStore.setTokens('access', 'refresh')
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(json({ title: 'Internal Server Error', status: 500 }, 500))

    const error = await failure(request('/api/projects'))

    expect(error.status).toBe(401)
    expect(tokenStore.getAccessToken()).toBe('access')
    expect(tokenStore.getRefreshToken()).toBe('refresh')
  })

  it('keeps the session when the network drops during the refresh', async () => {
    tokenStore.setTokens('access', 'refresh')
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const error = await failure(request('/api/projects'))

    expect(error.status).toBe(401)
    expect(tokenStore.getRefreshToken()).toBe('refresh')
  })

  it('shares a single refresh between parallel requests', async () => {
    tokenStore.setTokens('old-access', 'old-refresh')
    let refreshCalls = 0

    fetchMock.mockImplementation(async (input: unknown, init?: RequestInit) => {
      if (String(input).endsWith('/api/auth/refresh')) {
        refreshCalls++
        // Keep the refresh pending while the other 401s arrive.
        await new Promise((resolve) => setTimeout(resolve, 20))
        return json(authResult('new-access', 'new-refresh'))
      }

      const headers = (init?.headers ?? {}) as Record<string, string>
      return headers.Authorization === 'Bearer new-access' ? json({ ok: true }) : unauthorized()
    })

    const results = await Promise.all([
      request('/api/projects'),
      request('/api/users/me'),
      request('/api/projects/p1/tasks'),
    ])

    expect(refreshCalls).toBe(1)
    expect(results).toHaveLength(3)
    expect(tokenStore.getAccessToken()).toBe('new-access')
  })

  it('does not try to refresh when auth is false (a wrong password is a real 401)', async () => {
    tokenStore.setTokens('access', 'refresh')
    fetchMock.mockResolvedValueOnce(
      json({ title: 'Unauthorized', status: 401, detail: 'Invalid email or password.' }, 401),
    )

    const error = await failure(
      request('/api/auth/login', { method: 'POST', body: { email: 'a@b.c', password: 'x' }, auth: false }),
    )

    expect(error.status).toBe(401)
    expect(error.message).toBe('Invalid email or password.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})