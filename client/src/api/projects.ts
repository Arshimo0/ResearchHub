import { request } from './client'
import type { CreateProjectRequest, Project, ProjectSummary } from './types'

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
}

export const projectsApi = {
  list: () => request<ProjectSummary[]>('/api/projects'),
  get: (id: string) => request<Project>(`/api/projects/${encodeURIComponent(id)}`),
  create: (body: CreateProjectRequest) => request<Project>('/api/projects', { method: 'POST', body }),
}