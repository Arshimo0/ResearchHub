import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './client'
import { TagUpdateError, papersApi, savePaperChanges } from './papers'
import type { Paper, UpdatePaperRequest } from './types'

const paper: Paper = {
  id: 'pa1',
  projectId: 'p1',
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.',
  abstract: '',
  publicationDate: null,
  doiOrUrl: null,
  pdfReference: null,
  addedByUserId: 'u1',
  addedByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  tags: [
    { id: 't1', name: 'nlp' },
    { id: 't2', name: 'vision' },
  ],
}

const details: UpdatePaperRequest = {
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.',
  abstract: '',
  publicationDate: null,
  doiOrUrl: null,
  pdfReference: null,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('savePaperChanges', () => {
  it('saves the details, then adds new tags and removes dropped ones', async () => {
    const calls: string[] = []
    vi.spyOn(papersApi, 'update').mockImplementation(async () => {
      calls.push('update')
      return paper
    })
    vi.spyOn(papersApi, 'addTag').mockImplementation(async (_id, body) => {
      calls.push(`add ${body.name}`)
      return paper
    })
    vi.spyOn(papersApi, 'removeTag').mockImplementation(async (_id, tagId) => {
      calls.push(`remove ${tagId}`)
      return { ...paper, title: 'final state' }
    })

    const result = await savePaperChanges(paper, details, ['nlp', 'transformers'])

    expect(calls).toEqual(['update', 'add transformers', 'remove t2'])
    expect(result.title).toBe('final state')
  })

  it('does not touch the tags when they did not change', async () => {
    vi.spyOn(papersApi, 'update').mockResolvedValue(paper)
    const addTag = vi.spyOn(papersApi, 'addTag')
    const removeTag = vi.spyOn(papersApi, 'removeTag')

    await savePaperChanges(paper, details, ['vision', 'nlp'])

    expect(addTag).not.toHaveBeenCalled()
    expect(removeTag).not.toHaveBeenCalled()
  })

  it('reports a tag failure as a TagUpdateError after the details were saved', async () => {
    const update = vi.spyOn(papersApi, 'update').mockResolvedValue(paper)
    vi.spyOn(papersApi, 'addTag').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { name: ['Tag name is too long.'] } },
        'Validation failed',
      ),
    )

    const failure = savePaperChanges(paper, details, ['nlp', 'vision', 'x'])

    await expect(failure).rejects.toBeInstanceOf(TagUpdateError)
    await expect(failure).rejects.toThrow('Tag name is too long.')
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('does not touch the tags when the details cannot be saved', async () => {
    vi.spyOn(papersApi, 'update').mockRejectedValue(new ApiError(400, null, 'Validation failed'))
    const addTag = vi.spyOn(papersApi, 'addTag')

    const failure = savePaperChanges(paper, details, ['nlp', 'vision', 'x'])

    await expect(failure).rejects.toBeInstanceOf(ApiError)
    await expect(failure).rejects.not.toBeInstanceOf(TagUpdateError)
    expect(addTag).not.toHaveBeenCalled()
  })
})

describe('listForProject', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(
      async () =>
        new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('requests the whole list when there are no filters', async () => {
    await papersApi.listForProject('p1')

    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/api/projects/p1/papers')
  })

  it('sends each active filter as a query parameter', async () => {
    await papersApi.listForProject('p1', {
      tag: 'nlp',
      author: 'van der Berg',
      from: '2017-01-01',
      to: '2017-12-31',
    })

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'http://api.test/api/projects/p1/papers?tag=nlp&author=van+der+Berg&from=2017-01-01&to=2017-12-31',
    )
  })
})