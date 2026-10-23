import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { FormError } from '../components/FormError'
import { PageLoading } from '../components/PageLoading'
import { TextField } from '../components/TextField'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'

const FIELDS = ['email', 'password'] as const

function redirectTarget(state: unknown): string {
  const from = (state as { from?: { pathname?: string; search?: string } } | null)?.from
  return from?.pathname ? `${from.pathname}${from.search ?? ''}` : '/'
}

export function LoginPage() {
  const { status, login } = useAuth()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>(noErrors)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <PageLoading />
  if (status === 'authenticated') return <Navigate to={redirectTarget(location.state)} replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors(noErrors)

    try {
      await login({ email, password })
    } catch (error) {
      setErrors(toFormErrors(error, FIELDS))
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-card border border-line bg-surface p-8 backdrop-blur-md">
      <h1 className="text-2xl font-semibold tracking-tight">Log in</h1>
      <p className="mt-1 text-sm text-ink-muted">Welcome back to ResearchHub.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <FormError message={errors.form} />

        <TextField
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.fields.email}
        />
        <TextField
          label="Password"
          type="password"
          name="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.fields.password}
        />

        <Button type="submit" loading={submitting} className="w-full">
          Log in
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        No account yet?{' '}
        <Link to="/register" className="text-accent hover:text-accent-strong">
          Create one
        </Link>
      </p>
    </section>
  )
}