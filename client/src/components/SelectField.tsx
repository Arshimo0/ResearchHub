import { useId, type SelectHTMLAttributes } from 'react'

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  hint?: string
}

export function SelectField({ label, error, hint, className = '', children, ...props }: SelectFieldProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-muted">
        {label}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        className={`w-full rounded-control border bg-surface-raised px-3 py-2 text-ink focus:ring-2 focus:ring-accent focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 ${error ? 'border-danger' : 'border-line'} ${className}`}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  )
}