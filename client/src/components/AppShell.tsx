import { Outlet } from 'react-router'

export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-surface backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <span className="text-lg font-semibold tracking-tight">
            Research<span className="text-accent">Hub</span>
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}