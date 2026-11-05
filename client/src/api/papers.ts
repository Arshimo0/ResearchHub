import { request } from './client'
import type { CreatePaperRequest, Paper } from './types'

export const paperKeys = {
  all: ['papers'] as const,
  list: (projectId: string) => [...paperKeys.all, 'list', projectId] as const,
}

export const papersApi = {
  listForProject: (projectId: string) =>
    request<Paper[]>(`/api/projects/${encodeURIComponent(projectId)}/papers`),
  create: (projectId: string, body: CreatePaperRequest) =>
    request<Paper>(`/api/projects/${encodeURIComponent(projectId)}/papers`, { method: 'POST', body }),
}