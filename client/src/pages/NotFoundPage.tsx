import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="max-w-xl rounded-card border border-line bg-surface p-8 backdrop-blur-md">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-ink-muted">That address doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block text-accent hover:text-accent-strong">
        Back to home
      </Link>
    </section>
  )
}