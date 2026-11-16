import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { taskKeys, tasksApi } from '../api/tasks'
import { Button } from '../components/Button'
import { ErrorPanel } from '../components/ErrorPanel'
import { NewTaskDialog } from '../components/NewTaskDialog'
import { PageLoading } from '../components/PageLoading'
import { TaskCard } from '../components/TaskCard'
import { TaskStatusActions } from '../components/TaskStatusActions'
import { STATUS_ORDER, canChangeStatus, groupByStatus, statusLabel } from '../lib/tasks'
import { useProject } from './projectContext'

export function ProjectTasksTab() {
  const { project, currentUserId, isOwner } = useProject()
  const [adding, setAdding] = useState(false)

  const query = useQuery({
    queryKey: taskKeys.list(project.id),
    queryFn: () => tasksApi.listForProject(project.id),
  })

  let body
  if (query.isPending) {
    body = <PageLoading />
  } else if (query.isError) {
    body = (
      <ErrorPanel
        title="Couldn't load tasks"
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  } else if (query.data.length === 0) {
    body = (
      <div className="rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
        <h3 className="text-lg font-semibold">No tasks yet</h3>
        <p className="mt-1 text-sm text-ink-muted">Use "Add task" to create the first one.</p>
      </div>
    )
  } else {
    // The API returns tasks oldest first with an explicit order, so that order is kept inside each group.
    const groups = groupByStatus(query.data)
    const someLocked = query.data.some((task) => !canChangeStatus(task, currentUserId, isOwner))

    body = (
      <>
        <div className="space-y-8">
          {STATUS_ORDER.filter((status) => groups[status].length > 0).map((status) => (
            <div key={status}>
              <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
                {`${statusLabel[status]} (${groups[status].length})`}
              </h3>
              <ul className="mt-3 space-y-3">
                {groups[status].map((task) => (
                  <li key={task.id}>
                    <TaskCard task={task}>
                      {/* The API decides who may change a status. These buttons only avoid offering what it would refuse. */}
                      {canChangeStatus(task, currentUserId, isOwner) ? <TaskStatusActions task={task} /> : null}
                    </TaskCard>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {someLocked ? (
          <p className="mt-6 text-xs text-ink-faint">
            Only a task's assignee or a project owner can change its status.
          </p>
        ) : null}
      </>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Tasks{query.isSuccess ? ` (${query.data.length})` : ''}
        </h2>
        <Button onClick={() => setAdding(true)}>Add task</Button>
      </div>

      <div className="mt-4">{body}</div>

      <NewTaskDialog
        projectId={project.id}
        members={project.members}
        currentUserId={currentUserId}
        open={adding}
        onClose={() => setAdding(false)}
      />
    </section>
  )
}