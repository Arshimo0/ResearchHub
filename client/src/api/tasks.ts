import { ContractError, request } from './client'
import type {
  CreateResearchTaskRequest,
  ResearchTask,
  ResearchTaskStatus,
  TaskPriority,
  UpdateResearchTaskRequest,
} from './types'

export const taskKeys = {
  all: ['tasks'] as const,
  list: (projectId: string) => [...taskKeys.all, 'list', projectId] as const,
}

const STATUSES: readonly ResearchTaskStatus[] = ['ToDo', 'InProgress', 'Done']
const PRIORITIES: readonly TaskPriority[] = ['Low', 'Medium', 'High']

/**
 * Checks what the server sent. A value outside the contract fails here with a clear
 * message, instead of crashing a screen later with a confusing one.
 */
function checkTask(task: ResearchTask): ResearchTask {
  if (task && STATUSES.includes(task.status) && PRIORITIES.includes(task.priority)) return task

  console.error('Unexpected task data from the server:', task)
  throw new ContractError(
    `The server sent a task this app does not understand (status: ${JSON.stringify(task?.status)}, priority: ${JSON.stringify(task?.priority)}).`,
  )
}

const projectTasksPath = (projectId: string) => `/api/projects/${encodeURIComponent(projectId)}/tasks`
const taskPath = (id: string) => `/api/tasks/${encodeURIComponent(id)}`

export const tasksApi = {
  listForProject: async (projectId: string) => {
    const tasks = await request<ResearchTask[]>(projectTasksPath(projectId))

    if (!Array.isArray(tasks)) throw new ContractError('The server did not send a list of tasks.')

    return tasks.map(checkTask)
  },
  create: (projectId: string, body: CreateResearchTaskRequest) =>
    request<ResearchTask>(projectTasksPath(projectId), { method: 'POST', body }),
  update: (id: string, body: UpdateResearchTaskRequest) =>
    request<ResearchTask>(taskPath(id), { method: 'PUT', body }),
  /** A null user id clears the assignee. */
  assign: (id: string, userId: string | null) =>
    request<ResearchTask>(`${taskPath(id)}/assignee`, { method: 'PUT', body: { userId } }),
  changeStatus: (id: string, status: ResearchTaskStatus) =>
    request<ResearchTask>(`${taskPath(id)}/status`, { method: 'PATCH', body: { status } }),
  remove: (id: string) => request<void>(taskPath(id), { method: 'DELETE' }),
}