import type { ButtonHTMLAttributes } from 'react'

const variants = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong',
  ghost: 'border border-line text-ink-muted hover:text-ink',
}

const sizes = {
  md: 'px-4 py-2',
  sm: 'px-3 py-1.5 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants
  size?: keyof typeof sizes
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className = '',
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      disabled={disabled || loading}
      className={`rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading ? 'Please wait…' : children}
    </button>
  )
}