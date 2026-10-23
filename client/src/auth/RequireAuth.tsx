import { Navigate, Outlet, useLocation } from 'react-router'
import { PageLoading } from '../components/PageLoading'
import { useAuth } from './useAuth'

export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <PageLoading />

  if (status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}