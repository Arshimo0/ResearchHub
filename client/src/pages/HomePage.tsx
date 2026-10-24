import { useAuth } from '../auth/useAuth'

export function HomePage() {
  const { user } = useAuth()

  return (
    <section className="max-w-xl rounded-card border border-line bg-surface p-8 backdrop-blur-md">
      <h1 className="text-3xl font-semibold tracking-tight">Welcome, {user?.displayName}</h1>
      <p className="mt-2 text-ink-muted">Your projects will appear here.</p>
    </section>
  )
}