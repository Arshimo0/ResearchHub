import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { projectKeys, projectsApi } from '../api/projects'
import type { Project } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Badge } from '../components/Badge'
import { ErrorPanel } from '../components/ErrorPanel'
import { MessagePanel } from '../components/MessagePanel'
import { PageLoading } from '../components/PageLoading'
import { ProjectStatusBadge } from '../components/ProjectStatusBadge'
import { formatDate } from '../lib/format'

function ProjectDetail({ project, currentUserId }: { project: Project; currentUserId?: string }) {
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
        <p className="mt-4 text-xs text-ink-faint">Created {formatDate(project.createdAt)}</p>
      </section>

      <section className="mt-6 rounded-card border border-line bg-surface p-6 backdrop-blur-md">
        <h2 className="text-lg font-semibold tracking-tight">Members ({project.members.length})</h2>

        <ul aria-label="Members" className="mt-4 divide-y divide-line">
          {project.members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent"
                >
                  {member.displayName.trim().charAt(0).toUpperCase() || '?'}
                </span>
                <div>
                  <p className="font-medium">
                    {member.displayName}
                    {member.userId === currentUserId ? (
                      <span className="ml-2 text-xs font-normal text-ink-faint">(you)</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-ink-faint">Joined {formatDate(member.joinedAt)}</p>
                </div>
              </div>
              <Badge tone={member.role === 'Owner' ? 'accent' : 'neutral'}>{member.role}</Badge>
            </li>
          ))}
        </ul>
      </section>
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