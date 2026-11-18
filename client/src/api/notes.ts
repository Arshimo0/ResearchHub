import { request } from './client'
import type { CreateNoteRequest, Note, UpdateNoteRequest } from './types'

export const noteKeys = {
  all: ['notes'] as const,
  list: (paperId: string) => [...noteKeys.all, 'list', paperId] as const,
}

const notesPath = (paperId: string) => `/api/papers/${encodeURIComponent(paperId)}/notes`
const notePath = (id: string) => `/api/notes/${encodeURIComponent(id)}`

export const notesApi = {
  list: (paperId: string) => request<Note[]>(notesPath(paperId)),
  create: (paperId: string, body: CreateNoteRequest) =>
    request<Note>(notesPath(paperId), { method: 'POST', body }),
  update: (id: string, body: UpdateNoteRequest) => request<Note>(notePath(id), { method: 'PUT', body }),
  remove: (id: string) => request<void>(notePath(id), { method: 'DELETE' }),
}