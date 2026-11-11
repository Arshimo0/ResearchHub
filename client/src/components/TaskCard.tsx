import { useId } from 'react'
import { Link } from 'react-router'
import type { ResearchTask, TaskPriority } from '../api/types'
import { formatCalendarDate, formatDate } from '../lib/format'
import { isOverdue } from '../lib/tasks'
import { Badge } from './Badge'

const priorityTone = {
  Low: 'neutral',
  Medium: 'warning',
  High: 'danger',
} as const satisfies Record<TaskPriority, 'neutral' | 'warning' | 'danger'>

export function TaskCard({ task }: { task: ResearchTask }) {
  const titleId = useId()
  const overdue = isOverdue(task.deadline, task.status)
  const deadline = task.deadline ? formatCalendarDate(task.deadline) : ''

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-card border border-line bg-surface p-5 backdrop-blur-md"
    >
      <div className="flex items-start justify-between gap-3">
        <h4 id={titleId} className="text-base font-semibold tracking-tight">
          {task.title}
        </h4>
        <div className="flex shrink-0 items-center gap-2">
          {overdue ? <Badge tone="danger">Overdue</Badge> : null}
          <Badge tone={priorityTone[task.priority]}>{`${task.priority} priority`}</Badge>
        </div>
      </div>

      {task.description ? (
        <p className="mt-2 line-clamp-3 whitespace-pre-line text-sm text-ink-muted">{task.description}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
        <span>{task.assignedToName ? `Assigned to ${task.assignedToName}` : 'Unassigned'}</span>
        {deadline ? <span>{`Due ${deadline}`}</span> : null}
        {task.paperId ? (
          <Link
            to={`/papers/${task.paperId}`}
            aria-label={`Open the paper linked to ${task.title}`}
            className="text-accent hover:text-accent-strong"
          >
            Open linked paper
          </Link>
        ) : null}
      </div>

      <p className="mt-3 text-xs text-ink-faint">
        {`Created by ${task.createdByName} on ${formatDate(task.createdAt)}`}
        {task.status === 'Done' && task.completedAt ? ` · Completed ${formatDate(task.completedAt)}` : ''}
      </p>
    </article>
  )
}