import { Link, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Button } from './Button'
import { SearchBox } from './SearchBox'

export function AppShell() {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="shrink-0 text-lg font-semibold tracking-tight">
            Research<span className="text-accent">Hub</span>
          </Link>

          {status === 'authenticated' ? <SearchBox /> : null}

          <nav className="ml-auto flex shrink-0 items-center gap-4 text-sm">
            {status === 'authenticated' && user ? (
              <>
                <span className="hidden text-ink-muted sm:inline">{user.displayName}</span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  Log out
                </Button>
              </>
            ) : status === 'anonymous' ? (
              <>
                <Link to="/login" className="text-ink-muted hover:text-ink">
                  Log in
                </Link>
                <Link to="/register" className="text-accent hover:text-accent-strong">
                  Sign up
                </Link>
              </>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}