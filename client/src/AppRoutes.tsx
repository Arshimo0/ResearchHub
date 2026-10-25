import { Route, Routes } from 'react-router'
import { RequireAuth } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { ProjectsPage } from './pages/ProjectsPage'
import { LoginPage } from './pages/LoginPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { RegisterPage } from './pages/RegisterPage'
import { ProjectDetailPage } from './pages/ProjectDetailPage'
import { ProjectMembersTab } from './pages/ProjectMembersTab'
import { ProjectPapersTab } from './pages/ProjectPapersTab'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

      <Route element={<RequireAuth />}>
        <Route path="/" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
          <Route index element={<ProjectPapersTab />} />
          <Route path="members" element={<ProjectMembersTab />} />
        </Route>
      </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}