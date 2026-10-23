export function PageLoading() {
  return (
    <div role="status" className="flex items-center gap-3 py-16 text-ink-muted">
      <span className="size-4 animate-spin rounded-full border-2 border-line border-t-accent" />
      Loading…
    </div>
  )
}