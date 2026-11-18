import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from './ErrorBoundary'

function Page({ explode }: { explode: boolean }) {
  if (explode) throw new Error('kaboom')
  return <p>All good</p>
}

const ui = (resetKey: string, explode: boolean) => (
  <MemoryRouter>
    <ErrorBoundary resetKey={resetKey}>
      <Page explode={explode} />
    </ErrorBoundary>
  </MemoryRouter>
)

beforeEach(() => {
  // React logs every caught error, which would bury the real test output.
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ErrorBoundary', () => {
  it('shows its children when nothing goes wrong', () => {
    render(ui('a', false))

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('replaces a crashing page with a message and a way out', () => {
    render(ui('a', true))

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong on this page')
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your projects' })).toHaveAttribute('href', '/')
    expect(screen.queryByText('All good')).not.toBeInTheDocument()
  })

  it('gives the next page a fresh start when the address changes', () => {
    const { rerender } = render(ui('a', true))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    rerender(ui('b', false))

    expect(screen.getByText('All good')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})