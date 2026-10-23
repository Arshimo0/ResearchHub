import { useAuth } from '../auth/useAuth'

export function HomePage() {
  const { user, logout } = useAuth()

  return (
    <section className="max-w-xl rounded-card border border-line bg-surface p-8 backdrop-blur-md">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome, {user?.displayName}</h1>
      <p className="mt-2 text-ink-muted">Your projects will appear here.</p>
      <button
        onClick={logout}
        className="mt-6 rounded-control border border-line px-4 py-2 text-ink-muted transition-colors hover:text-ink"
      >
        Log out
      </button>
    </section>
  )
}