import { request } from './client'
import type { CreateResearchTaskRequest, ResearchTask, ResearchTaskStatus } from './types'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
}

export const tasksApi = {
  listForProject: (projectId: string) =>
    request<ResearchTask[]>(`/api/projects/${encodeURIComponent(projectId)}/tasks`),
  create: (projectId: string, body: CreateResearchTaskRequest) =>
    request<ResearchTask>(`/api/projects/${encodeURIComponent(projectId)}/tasks`, {
      method: 'POST',
      body,
    }),
  changeStatus: (id: string, status: ResearchTaskStatus) =>
    request<ResearchTask>(`/api/tasks/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
}