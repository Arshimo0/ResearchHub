import { BrowserRouter } from 'react-router'
import { AppRoutes } from './AppRoutes'
import { AuthProvider } from './auth/AuthProvider'
import { Background } from './components/Background'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Background />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}