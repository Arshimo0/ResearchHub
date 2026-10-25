import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, Outlet, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { projectKeys, projectsApi } from '../api/projects'
import type { Project } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Button } from '../components/Button'
import { DeleteProjectDialog } from '../components/DeleteProjectDialog'
import { EditProjectDialog } from '../components/EditProjectDialog'
import { ErrorPanel } from '../components/ErrorPanel'
import { MessagePanel } from '../components/MessagePanel'
import { PageLoading } from '../components/PageLoading'
import { ProjectStatusBadge } from '../components/ProjectStatusBadge'
import { TabNav } from '../components/TabNav'
import { formatDate } from '../lib/format'
import type { ProjectContext } from './projectContext'

function ProjectDetail({ project, currentUserId }: { project: Project; currentUserId?: string }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // This only decides what to offer. The API makes the real decision.
  const isOwner = project.members.some((m) => m.userId === currentUserId && m.role === 'Owner')
  const context: ProjectContext = { project, currentUserId, isOwner }

  return (
    <>
      <section className="rounded-card border border-line bg-surface p-6 backdrop-blur-md">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
          <ProjectStatusBadge status={project.status} />
        </div>
        <p className="mt-3 whitespace-pre-line text-ink-muted">
          {project.description || 'No description yet.'}
        </p>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-ink-faint">Created {formatDate(project.createdAt)}</p>

          {isOwner ? (
            <div className="flex gap-3">
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Edit project
              </Button>
              <Button variant="dangerGhost" size="sm" onClick={() => setDeleting(true)}>
                Delete project
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="mt-6">
        <TabNav
          label="Project sections"
          tabs={[
            { to: `/projects/${project.id}`, label: 'Papers', end: true },
            { to: `/projects/${project.id}/members`, label: 'Members' },
          ]}
        />
        <div className="mt-6">
          <Outlet context={context} />
        </div>
      </div>

      {isOwner ? (
        <>
          <EditProjectDialog project={project} open={editing} onClose={() => setEditing(false)} />
          <DeleteProjectDialog project={project} open={deleting} onClose={() => setDeleting(false)} />
        </>
      ) : null}
    </>
  )
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  const { user } = useAuth()

  const query = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectsApi.get(projectId),
  })

  let body
  if (query.isPending) {
    body = <PageLoading />
  } else if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0

    if (status === 404) {
      body = (
        <MessagePanel
          title="Project not found"
          message="It may have been deleted, or the link may be wrong."
        />
      )
    } else if (status === 403) {
      body = (
        <MessagePanel
          title="You're not a member of this project"
          message="Ask one of its owners to add you."
        />
      )
    } else {
      body = <ErrorPanel message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
    }
  } else {
    body = <ProjectDetail project={query.data} currentUserId={user?.id} />
  }

  return (
    <div>
      <Link to="/" className="text-sm text-ink-muted hover:text-ink">
        ← All projects
      </Link>
      <div className="mt-4">{body}</div>
    </div>
  )
}