import { request } from './client'
import type { CreateProjectRequest, Project, ProjectSummary } from './types'

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
}

export const projectsApi = {
  list: () => request<ProjectSummary[]>('/api/projects'),
  create: (body: CreateProjectRequest) => request<Project>('/api/projects', { method: 'POST', body }),
}