import { request } from './client'
import type { Paper } from './types'

export const paperKeys = {
  all: ['papers'] as const,
  list: (projectId: string) => [...paperKeys.all, 'list', projectId] as const,
}

export const papersApi = {
  listForProject: (projectId: string) =>
    request<Paper[]>(`/api/projects/${encodeURIComponent(projectId)}/papers`),
}