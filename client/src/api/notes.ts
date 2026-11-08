import { request } from './client'
import type { CreateNoteRequest, Note } from './types'

export const noteKeys = {
  all: ['notes'] as const,
  list: (paperId: string) => [...noteKeys.all, 'list', paperId] as const,
}

const notesPath = (paperId: string) => `/api/papers/${encodeURIComponent(paperId)}/notes`

export const notesApi = {
  list: (paperId: string) => request<Note[]>(notesPath(paperId)),
  create: (paperId: string, body: CreateNoteRequest) =>
    request<Note>(notesPath(paperId), { method: 'POST', body }),
}