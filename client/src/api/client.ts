import { tokenStore } from '../auth/tokenStore'
import type { AuthResult, ProblemDetails } from './types'

const API_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '')

if (!API_URL) {
  throw new Error('VITE_API_URL is not set. See client/.env.development.')
}

export class ApiError extends Error {
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, problem: ProblemDetails | null, message: string) {
    super(message)
    this.status = status
    this.problem = problem
  }

  /** Per-field validation messages, keyed by camelCase field name. */
  get fieldErrors(): Record<string, string[]> {
    return this.problem?.errors ?? {}
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  /** Attach the access token, and retry once after a refresh on 401. Default: true. */
  auth?: boolean
}

// Refresh tokens are single use, so only one refresh may run at a time.
let refreshInFlight: Promise<boolean> | null = null

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= doRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function doRefresh(): Promise<boolean> {
  const refreshToken = tokenStore.getRefreshToken()
  if (!refreshToken) return false

  let response: Response
  try {
    response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
  } catch {
    return false // network problem: keep the tokens and try again later
  }

  // Only a definite rejection ends the session. A 500 must not log anyone out.
  if (response.status === 400 || response.status === 401) tokenStore.clear()
  if (!response.ok) return false

  const auth = (await response.json()) as AuthResult
  tokenStore.setTokens(auth.accessToken, auth.refreshToken)
  return true
}

async function toApiError(response: Response): Promise<ApiError> {
  let problem: ProblemDetails | null = null
  try {
    problem = (await response.json()) as ProblemDetails
  } catch {
    // the body was empty or not JSON
  }

  const message = problem?.detail ?? problem?.title ?? `Request failed (${response.status})`
  return new ApiError(response.status, problem, message)
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = true } = options

  const send = async (): Promise<Response> => {
    const headers: Record<string, string> = {}
    if (body !== undefined) headers['Content-Type'] = 'application/json'

    const token = tokenStore.getAccessToken()
    if (auth && token) headers.Authorization = `Bearer ${token}`

    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
      })
    } catch {
      throw new ApiError(0, null, 'Cannot reach the server. Check your connection and try again.')
    }
  }

  let response = await send()

  if (response.status === 401 && auth && (await refreshSession())) {
    response = await send()
  }

  if (!response.ok) throw await toApiError(response)
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}