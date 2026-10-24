import { request } from './client'
import type { ProjectSummary } from './types'

export const projectKeys = {
  all: ['projects'] as const,
  list: () => [...projectKeys.all, 'list'] as const,
}

export const projectsApi = {
  list: () => request<ProjectSummary[]>('/api/projects'),
}