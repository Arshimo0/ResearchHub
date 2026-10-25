import { request } from './client'
import type {
  AddMemberRequest,
  CreateProjectRequest,
  Project,
  ProjectSummary,
  UpdateProjectRequest,
} from './types'

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
}

const projectPath = (id: string) => `/api/projects/${encodeURIComponent(id)}`

export const projectsApi = {
  list: () => request<ProjectSummary[]>('/api/projects'),
  get: (id: string) => request<Project>(projectPath(id)),
  create: (body: CreateProjectRequest) => request<Project>('/api/projects', { method: 'POST', body }),
  update: (id: string, body: UpdateProjectRequest) =>
    request<Project>(projectPath(id), { method: 'PUT', body }),
  remove: (id: string) => request<void>(projectPath(id), { method: 'DELETE' }),
  addMember: (id: string, body: AddMemberRequest) =>
    request<Project>(`${projectPath(id)}/members`, { method: 'POST', body }),
  removeMember: (id: string, userId: string) =>
    request<Project>(`${projectPath(id)}/members/${encodeURIComponent(userId)}`, { method: 'DELETE' }),
}