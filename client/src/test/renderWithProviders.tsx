import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import type { User } from '../api/types'
import { AuthContext, type AuthContextValue } from '../auth/AuthContext'

interface Options {
  route?: string
  /** Render as this signed-in user. Omit for pages that don't read the session. */
  user?: User
}

export function renderWithProviders(ui: ReactElement, { route = '/', user }: Options = {}) {
  // No retries in tests, so a failing query shows its error immediately.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  const tree = (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  )

  const session: AuthContextValue | null = user
    ? {
        status: 'authenticated',
        user,
        login: async () => {},
        register: async () => {},
        logout: () => {},
      }
    : null

  const result = render(session ? <AuthContext.Provider value={session}>{tree}</AuthContext.Provider> : tree)

  return { ...result, queryClient }
}