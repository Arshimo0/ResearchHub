import type { ResearchTask, TaskPriority, UpdateResearchTaskRequest } from '../api/types'

export interface TaskFormValues {
  title: string
  description: string
  priority: TaskPriority
  deadline: string
}

export const emptyTaskValues: TaskFormValues = {
  title: '',
  description: '',
  priority: 'Medium',
  deadline: '',
}

export const TASK_FIELDS = [
  'title',
  'description',
  'priority',
  'deadline',
  'paperId',
  'assignedToUserId',
] as const

export function taskToFormValues(task: ResearchTask): TaskFormValues {
  return {
    title: task.title,
    description: task.description,
    priority: task.priority,
    // A date input wants yyyy-mm-dd. Slicing the text avoids any time zone conversion.
    deadline: task.deadline?.slice(0, 10) ?? '',
  }
}

export function toTaskDetails(values: TaskFormValues): UpdateResearchTaskRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    priority: values.priority,
    deadline: values.deadline || null,
  }
}