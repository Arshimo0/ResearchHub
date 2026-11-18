import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  /** When this changes, for example a new address, a failed boundary tries again. */
  resetKey?: string
}

interface ErrorBoundaryState {
  failed: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('A page crashed while rendering:', error, info.componentStack)
  }

  componentDidUpdate(previous: ErrorBoundaryProps) {
    // Leaving the broken page gives the next one a fresh start.
    if (this.state.failed && previous.resetKey !== this.props.resetKey) {
      this.setState({ failed: false })
    }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <div role="alert" className="rounded-card border border-danger/40 bg-danger/10 p-6">
        <p className="font-medium text-danger">Something went wrong on this page</p>
        <p className="mt-1 text-sm text-ink-muted">
          The rest of the app still works. Reload the page, or go back to your projects.
        </p>
        <div className="mt-4 flex items-center gap-4">
          <Button size="sm" onClick={() => window.location.reload()}>
            Reload page
          </Button>
          <Link to="/" className="text-sm text-accent hover:text-accent-strong">
            Back to your projects
          </Link>
        </div>
      </div>
    )
  }
}