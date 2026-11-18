import type { ResearchTask, ResearchTaskStatus } from '../api/types'

export const STATUS_ORDER: ResearchTaskStatus[] = ['ToDo', 'InProgress', 'Done']

export const statusLabel: Record<ResearchTaskStatus, string> = {
  ToDo: 'To do',
  InProgress: 'In progress',
  Done: 'Done',
}

/** Splits tasks by status, keeping their order within each group. */
export function groupByStatus(tasks: ResearchTask[]): Record<ResearchTaskStatus, ResearchTask[]> {
  const groups: Record<ResearchTaskStatus, ResearchTask[]> = { ToDo: [], InProgress: [], Done: [] }

  for (const task of tasks) groups[task.status].push(task)

  return groups
}

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/

function localDay(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * A task is overdue once its deadline day has ended in the viewer's calendar.
 * A task due today is not overdue yet, and a finished task never is.
 */
export function isOverdue(
  deadline: string | null,
  status: ResearchTaskStatus,
  today: Date = new Date(),
): boolean {
  if (!deadline || status === 'Done') return false

  const match = DATE_PREFIX.exec(deadline)
  if (!match) return false

  // yyyy-mm-dd strings sort the same way the dates do.
  return match[1] < localDay(today)
}

/** Who may change a task's status. The API enforces this. The UI only decides what to offer. */
export function canChangeStatus(task: ResearchTask, userId: string | undefined, isOwner: boolean): boolean {
  return isOwner || (userId !== undefined && task.assignedToUserId === userId)
}

/** The status changes offered on a card. The API allows any transition, but a few buttons read better. */
export const statusMoves: Record<ResearchTaskStatus, { label: string; to: ResearchTaskStatus }[]> = {
  ToDo: [
    { label: 'Start', to: 'InProgress' },
    { label: 'Mark done', to: 'Done' },
  ],
  InProgress: [
    { label: 'Mark done', to: 'Done' },
    { label: 'Back to To do', to: 'ToDo' },
  ],
  Done: [{ label: 'Reopen', to: 'InProgress' }],
}

/** Who may edit, assign or delete a task: its creator or a project owner. The API enforces this. */
export function canManageTask(task: ResearchTask, userId: string | undefined, isOwner: boolean): boolean {
  return isOwner || (userId !== undefined && task.createdByUserId === userId)
}