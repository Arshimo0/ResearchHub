import { useQuery } from '@tanstack/react-query'
import { errorMessage } from '../api/client'
import { taskKeys, tasksApi } from '../api/tasks'
import { ErrorPanel } from '../components/ErrorPanel'
import { PageLoading } from '../components/PageLoading'
import { TaskCard } from '../components/TaskCard'
import { STATUS_ORDER, groupByStatus, statusLabel } from '../lib/tasks'
import { useProject } from './projectContext'

export function ProjectTasksTab() {
  const { project } = useProject()

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
        <p className="mt-1 text-sm text-ink-muted">Tasks added to this project will appear here.</p>
      </div>
    )
  } else {
    // The API returns tasks oldest first with an explicit order, so that order is kept inside each group.
    const groups = groupByStatus(query.data)

    body = (
      <div className="space-y-8">
        {STATUS_ORDER.filter((status) => groups[status].length > 0).map((status) => (
          <div key={status}>
            <h3 className="text-sm font-semibold tracking-wide text-ink-muted uppercase">
              {`${statusLabel[status]} (${groups[status].length})`}
            </h3>
            <ul className="mt-3 space-y-3">
              {groups[status].map((task) => (
                <li key={task.id}>
                  <TaskCard task={task} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    )
  }

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">
        Tasks{query.isSuccess ? ` (${query.data.length})` : ''}
      </h2>

      <div className="mt-4">{body}</div>
    </section>
  )
}