import { Button } from './Button'

interface ErrorPanelProps {
  message: string
  onRetry?: () => void
}

export function ErrorPanel({ message, onRetry }: ErrorPanelProps) {
  return (
    <div role="alert" className="rounded-card border border-danger/40 bg-danger/10 p-6">
      <p className="font-medium text-danger">Couldn't load this page</p>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
      {onRetry ? (
        <Button variant="ghost" size="sm" className="mt-4" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  )
}