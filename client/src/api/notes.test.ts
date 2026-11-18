import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { notesApi } from './notes'

describe('notesApi', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(
      async () => new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('updates a note with PUT and a JSON body', async () => {
    await notesApi.update('n1', { content: 'Revised' })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/notes/n1')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ content: 'Revised' }))
  })

  it('deletes a note with DELETE, encoding the id', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 204 }))

    await notesApi.remove('a/b')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/notes/a%2Fb')
    expect(init.method).toBe('DELETE')
  })
})