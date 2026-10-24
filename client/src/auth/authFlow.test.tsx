import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../AppRoutes'
import { request } from '../api/client'
import type { AuthResult } from '../api/types'
import { AuthProvider } from './AuthProvider'
import { tokenStore } from './tokenStore'

const REFRESH_KEY = 'researchhub.refreshToken'

const fetchMock = vi.fn()
let unexpectedRequests: string[] = []

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const unauthorized = () => json({ title: 'Unauthorized', status: 401 }, 401)

const ana = { id: 'u1', email: 'ana@example.com', displayName: 'Ana', role: 'User' } as const

const authResult = (access = 'access-1', refresh = 'refresh-1'): AuthResult => ({
  accessToken: access,
  refreshToken: refresh,
  accessTokenExpiresAt: '2030-01-01T00:00:00Z',
  user: ana,
})

type Handler = (init: RequestInit) => Response

// Answers fake API calls by "METHOD /path". A request nobody expected is
// recorded and fails the test afterwards, instead of being swallowed as a
// network error by the client.
function mockApi(routes: Record<string, Handler>) {
  fetchMock.mockImplementation(async (input: unknown, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${new URL(String(input)).pathname}`
    const handler = routes[key]

    if (!handler) {
      unexpectedRequests.push(key)
      return json({ title: 'Not mocked', status: 501 }, 501)
    }

    return handler(init)
  })
}

const bearer = (init: RequestInit) =>
  (init.headers as Record<string, string> | undefined)?.Authorization

type UserSession = ReturnType<typeof userEvent.setup>

function renderApp(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}

async function logIn(user: UserSession) {
  await user.type(screen.getByLabelText('Email'), 'ana@example.com')
  await user.type(screen.getByLabelText('Password'), 'SecurePass123!')
  await user.click(screen.getByRole('button', { name: 'Log in' }))
}

beforeEach(() => {
  fetchMock.mockReset()
  unexpectedRequests = []
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  tokenStore.clear()
})

afterEach(() => {
  vi.unstubAllGlobals()
  expect(unexpectedRequests).toEqual([])
})

describe('registration', () => {
  it('registers, stores the session, and lands on the home page', async () => {
    mockApi({ 'POST /api/auth/register': () => json(authResult()) })
    const user = userEvent.setup()
    renderApp('/register')

    await user.type(screen.getByLabelText('Display name'), 'Ana')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), 'SecurePass123!')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Welcome, Ana' })).toBeInTheDocument()
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1')

    const sent = fetchMock.mock.calls[0][1] as RequestInit
    expect(JSON.parse(String(sent.body))).toEqual({
      displayName: 'Ana',
      email: 'ana@example.com',
      password: 'SecurePass123!',
    })
  })

  it('shows the API field errors under the matching inputs', async () => {
    mockApi({
      'POST /api/auth/register': () =>
        json(
          {
            title: 'Validation failed',
            status: 400,
            errors: { password: ['Password must be at least 8 characters.'] },
          },
          400,
        ),
    })
    const user = userEvent.setup()
    renderApp('/register')

    await user.type(screen.getByLabelText('Display name'), 'Ana')
    await user.type(screen.getByLabelText('Email'), 'ana@example.com')
    await user.type(screen.getByLabelText('Password'), '123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Password must be at least 8 characters.')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('login', () => {
  it('shows the server message for a wrong password without trying to refresh', async () => {
    mockApi({
      'POST /api/auth/login': () =>
        json({ title: 'Unauthorized', status: 401, detail: 'Invalid email or password.' }, 401),
    })
    const user = userEvent.setup()
    renderApp('/login')

    await logIn(user)

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends an anonymous visitor to the login page, then back to where they were going', async () => {
    mockApi({ 'POST /api/auth/login': () => json(authResult()) })
    const user = userEvent.setup()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()

    await logIn(user)

    expect(await screen.findByRole('heading', { name: 'Welcome, Ana' })).toBeInTheDocument()
  })

  it('logs out and returns to the login page', async () => {
    mockApi({ 'POST /api/auth/login': () => json(authResult()) })
    const user = userEvent.setup()
    renderApp('/login')

    await logIn(user)
    await user.click(await screen.findByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
  })
})

describe('session', () => {
  it('restores the session after a reload from the stored refresh token', async () => {
    localStorage.setItem(REFRESH_KEY, 'stored-refresh')
    mockApi({
      'GET /api/users/me': (init) => (bearer(init) === 'Bearer access-2' ? json(ana) : unauthorized()),
      'POST /api/auth/refresh': () => json(authResult('access-2', 'refresh-2')),
    })

    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Welcome, Ana' })).toBeInTheDocument()
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-2')
  })

  it('returns to the login page when the server rejects the session mid-use', async () => {
    mockApi({
      'POST /api/auth/login': () => json(authResult()),
      'GET /api/projects': () => unauthorized(),
      'POST /api/auth/refresh': () => unauthorized(),
    })
    const user = userEvent.setup()
    renderApp('/login')

    await logIn(user)
    expect(await screen.findByRole('heading', { name: 'Welcome, Ana' })).toBeInTheDocument()

    // A request is rejected, the refresh is rejected too, and the client ends the session.
    await act(async () => {
      await request('/api/projects').catch(() => undefined)
    })

    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument()
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
  })
})