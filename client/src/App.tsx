import { useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Background } from './components/Background'
import { ApiError, request } from './api/client'

const describe = (e: unknown) =>
  e instanceof ApiError ? `HTTP ${e.status}: ${e.message}` : String(e)

export default function App() {
  const [health, setHealth] = useState('checking…')
  const [projects, setProjects] = useState('checking…')

  useEffect(() => {
    request<{ status: string }>('/api/health', { auth: false })
      .then((h) => setHealth(h.status))
      .catch((e) => setHealth(describe(e)))

    request('/api/projects')
      .then(() => setProjects('unexpected success'))
      .catch((e) => setProjects(describe(e)))
  }, [])

  return (
    <>
      <Background />
      <AppShell>
        <section className="max-w-xl rounded-card border border-line bg-surface p-8 backdrop-blur-md">
          <h1 className="text-3xl font-semibold tracking-tight">API connection</h1>
          <p className="mt-4 text-ink-muted">Health: <span className="text-ink">{health}</span></p>
          <p className="mt-2 text-ink-muted">Projects while logged out: <span className="text-ink">{projects}</span></p>
        </section>
      </AppShell>
    </>
  )
}