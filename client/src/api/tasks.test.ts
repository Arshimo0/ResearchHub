import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContractError } from './client'
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
    vi.restoreAllMocks()
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

    const respondWith = (body: unknown) =>
    fetchMock.mockImplementationOnce(
      async () =>
        new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    )

  const goodTask = {
    id: 't1',
    projectId: 'p1',
    paperId: null,
    title: 'Read the paper',
    description: '',
    status: 'ToDo',
    priority: 'Medium',
    deadline: null,
    assignedToUserId: null,
    assignedToName: null,
    createdByUserId: 'u1',
    createdByName: 'Ana',
    createdAt: '2026-10-01T10:00:00Z',
    completedAt: null,
  }

  it('passes valid tasks through unchanged', async () => {
    respondWith([goodTask])

    await expect(tasksApi.listForProject('p1')).resolves.toEqual([goodTask])
  })

  it.each<[unknown, string]>([
    ['Todo', 'status: "Todo"'],
    [0, 'status: 0'],
    [undefined, 'status: undefined'],
  ])('rejects a task with status %j, saying what the server sent', async (status, shown) => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    respondWith([{ ...goodTask, status }])

    const failure = tasksApi.listForProject('p1')

    await expect(failure).rejects.toBeInstanceOf(ContractError)
    await expect(failure).rejects.toThrow(shown)
  })

  it('rejects a task with a priority the app does not know', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    respondWith([{ ...goodTask, priority: 'Urgent' }])

    await expect(tasksApi.listForProject('p1')).rejects.toThrow('priority: "Urgent"')
  })

  it('rejects a response that is not a list', async () => {
    respondWith({ message: 'nope' })

    const failure = tasksApi.listForProject('p1')

    await expect(failure).rejects.toBeInstanceOf(ContractError)
    await expect(failure).rejects.toThrow('did not send a list of tasks')
  })

  it('updates a task with PUT and a JSON body', async () => {
    const body = { title: 'Revised', description: 'Details', priority: 'Low' as const, deadline: null }

    await tasksApi.update('t1', body)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/tasks/t1')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify(body))
  })

  it('assigns a task with PUT to its assignee address', async () => {
    await tasksApi.assign('t1', 'u2')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/tasks/t1/assignee')
    expect(init.method).toBe('PUT')
    expect(init.body).toBe(JSON.stringify({ userId: 'u2' }))
  })

  it('sends a null user id to clear the assignee', async () => {
    await tasksApi.assign('t1', null)

    const init = fetchMock.mock.calls[0][1] as RequestInit
    expect(init.body).toBe(JSON.stringify({ userId: null }))
  })

  it('deletes a task with DELETE, encoding the id', async () => {
    fetchMock.mockImplementationOnce(async () => new Response(null, { status: 204 }))

    await tasksApi.remove('a/b')

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(String(url)).toBe('http://api.test/api/tasks/a%2Fb')
    expect(init.method).toBe('DELETE')
  })
})