import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { tasksApi } from './tasks'

describe('tasksApi', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockImplementation(
      async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lists the tasks of a project', async () => {
    await tasksApi.listForProject('p1')

    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/api/projects/p1/tasks')
  })

  it('encodes the project id', async () => {
    await tasksApi.listForProject('a/b')

    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/api/projects/a%2Fb/tasks')
  })
})