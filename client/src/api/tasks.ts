import { request } from './client'
import type { ResearchTask } from './types'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
}

export const tasksApi = {
  listForProject: (projectId: string) =>
    request<ResearchTask[]>(`/api/projects/${encodeURIComponent(projectId)}/tasks`),
}