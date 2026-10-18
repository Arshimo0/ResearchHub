import { AppShell } from './components/AppShell'
import { Background } from './components/Background'

export default function App() {
  return (
    <>
      <Background />
      <AppShell>
        <section className="max-w-xl rounded-card border border-line bg-surface p-8 backdrop-blur-md">
          <h1 className="text-3xl font-semibold tracking-tight">Design foundation</h1>
          <p className="mt-2 text-ink-muted">
            Tokens, layout shell and a reserved background slot are in place.
          </p>
          <button className="mt-6 rounded-control bg-accent px-4 py-2 font-medium text-accent-ink transition-colors hover:bg-accent-strong">
            Accent button
          </button>
        </section>
      </AppShell>
    </>
  )
}