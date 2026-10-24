import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { FormError } from '../components/FormError'
import { PageLoading } from '../components/PageLoading'
import { TextField } from '../components/TextField'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'

const FIELDS = ['displayName', 'email', 'password'] as const

export function RegisterPage() {
  const { status, register } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<FormErrors>(noErrors)
  const [submitting, setSubmitting] = useState(false)

  if (status === 'loading') return <PageLoading />
  if (status === 'authenticated') return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors(noErrors)

    try {
      await register({ displayName, email, password })
    } catch (error) {
      setErrors(toFormErrors(error, FIELDS))
      setSubmitting(false)
    }
  }

  return (
    <section className="mx-auto max-w-md rounded-card border border-line bg-surface p-8 backdrop-blur-md">
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-ink-muted">Organise your research with your team.</p>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        <FormError message={errors.form} />

        <TextField
          label="Display name"
          name="displayName"
          autoComplete="name"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          error={errors.fields.displayName}
        />
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
          autoComplete="new-password"
          hint="At least 8 characters."
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.fields.password}
        />

        <Button type="submit" loading={submitting} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-sm text-ink-muted">
        Already registered?{' '}
        <Link to="/login" className="text-accent hover:text-accent-strong">
          Log in
        </Link>
      </p>
    </section>
  )
}