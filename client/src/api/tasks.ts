import { ContractError, request } from './client'
import type {
  CreateResearchTaskRequest,
  ResearchTask,
  ResearchTaskStatus,
  TaskPriority,
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

export const tasksApi = {
  listForProject: async (projectId: string) => {
    const tasks = await request<ResearchTask[]>(`/api/projects/${encodeURIComponent(projectId)}/tasks`)

    if (!Array.isArray(tasks)) throw new ContractError('The server did not send a list of tasks.')

    return tasks.map(checkTask)
  },
  create: (projectId: string, body: CreateResearchTaskRequest) =>
    request<ResearchTask>(`/api/projects/${encodeURIComponent(projectId)}/tasks`, {
      method: 'POST',
      body,
    }),
  changeStatus: (id: string, status: ResearchTaskStatus) =>
    request<ResearchTask>(`/api/tasks/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status },
    }),
}