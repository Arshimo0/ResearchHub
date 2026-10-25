export function MessagePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-8 backdrop-blur-md">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-ink-muted">{message}</p>
    </div>
  )
}