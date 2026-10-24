export type PlatformRole = 'User' | 'Admin'
export type ProjectRole = 'Owner' | 'Member'
export type ProjectStatus = 'Active' | 'Completed' | 'Archived'
export interface User {
  id: string
  email: string
  displayName: string
  role: PlatformRole
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  displayName: string
  password: string
}

export interface ProblemDetails {
  title: string
  status: number
  traceId?: string
  detail?: string
  errors?: Record<string, string[]>
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: string
  memberCount: number
  myRole: ProjectRole
}