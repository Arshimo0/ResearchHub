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

  it('creates a task with POST and a JSON body', async () => {
    const body = {
      title: 'Draft outline',
      description: '',
      priority: 'High' as const,
      deadline: '2999-12-31',
      paperId: null,
      assignedToUserId: 'u2',
    }

    await tasksApi.create('p1', body)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/projects/p1/tasks')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(body))
  })

  it('changes a status with PATCH', async () => {
    await tasksApi.changeStatus('t1', 'Done')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/tasks/t1/status')
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ status: 'Done' }))
  })
})