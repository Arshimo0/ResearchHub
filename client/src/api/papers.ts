import { errorMessage, request } from './client'
import type { AddTagRequest, CreatePaperRequest, Paper, UpdatePaperRequest } from './types'

export const paperKeys = {
  all: ['papers'] as const,
  list: (projectId: string) => [...paperKeys.all, 'list', projectId] as const,
}

const paperPath = (id: string) => `/api/papers/${encodeURIComponent(id)}`

export const papersApi = {
  listForProject: (projectId: string) =>
    request<Paper[]>(`/api/projects/${encodeURIComponent(projectId)}/papers`),
  create: (projectId: string, body: CreatePaperRequest) =>
    request<Paper>(`/api/projects/${encodeURIComponent(projectId)}/papers`, { method: 'POST', body }),
  update: (id: string, body: UpdatePaperRequest) => request<Paper>(paperPath(id), { method: 'PUT', body }),
  remove: (id: string) => request<void>(paperPath(id), { method: 'DELETE' }),
  addTag: (id: string, body: AddTagRequest) =>
    request<Paper>(`${paperPath(id)}/tags`, { method: 'POST', body }),
  removeTag: (id: string, tagId: string) =>
    request<Paper>(`${paperPath(id)}/tags/${encodeURIComponent(tagId)}`, { method: 'DELETE' }),
}

/** The details were saved, but changing the tags failed. */
export class TagUpdateError extends Error {}

/**
 * Saves a paper's details and then its tags. The API has separate endpoints for
 * each, so this is several calls. Adding an existing tag and removing a missing
 * one are both no-ops on the server, so retrying after a failure is safe.
 */
export async function savePaperChanges(
  paper: Paper,
  details: UpdatePaperRequest,
  tags: string[],
): Promise<Paper> {
  let latest = await papersApi.update(paper.id, details)

  const currentNames = paper.tags.map((tag) => tag.name)
  const toAdd = tags.filter((name) => !currentNames.includes(name))
  const toRemove = paper.tags.filter((tag) => !tags.includes(tag.name))

  try {
    for (const name of toAdd) latest = await papersApi.addTag(paper.id, { name })
    for (const tag of toRemove) latest = await papersApi.removeTag(paper.id, tag.id)
  } catch (error) {
    throw new TagUpdateError(errorMessage(error))
  }

  return latest
}