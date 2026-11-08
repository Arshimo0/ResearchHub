import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router'
import { ApiError, errorMessage } from '../api/client'
import { paperKeys, papersApi } from '../api/papers'
import type { Paper } from '../api/types'
import { useAuth } from '../auth/useAuth'
import { Badge } from '../components/Badge'
import { ErrorPanel } from '../components/ErrorPanel'
import { MessagePanel } from '../components/MessagePanel'
import { NotesSection } from '../components/NotesSection'
import { PageLoading } from '../components/PageLoading'
import { PaperLinks } from '../components/PaperLinks'
import { formatDate, formatPublicationDate } from '../lib/format'

function PaperDetail({ paper, currentUserId }: { paper: Paper; currentUserId?: string }) {
  const published = paper.publicationDate ? formatPublicationDate(paper.publicationDate) : ''

  return (
    <>
      <section className="rounded-card border border-line bg-surface p-6 backdrop-blur-md">
        <h1 className="text-2xl font-semibold tracking-tight">{paper.title}</h1>

        <p className="mt-1 text-sm text-ink-muted">
          {paper.authors || 'Unknown authors'}
          {published ? <span className="text-ink-faint"> · Published {published}</span> : null}
        </p>

        <h2 className="mt-6 text-sm font-semibold tracking-wide text-ink-muted uppercase">Abstract</h2>
        <p className="mt-2 whitespace-pre-line text-ink-muted">{paper.abstract || 'No abstract.'}</p>

        {paper.tags.length > 0 ? (
          <ul aria-label="Tags" className="mt-4 flex flex-wrap gap-2">
            {paper.tags.map((tag) => (
              <li key={tag.id}>
                <Badge tone="accent">{tag.name}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
          <span>
            Added by {paper.addedByName} on {formatDate(paper.createdAt)}
          </span>
          <PaperLinks paper={paper} />
        </div>
      </section>

      <NotesSection paperId={paper.id} currentUserId={currentUserId} />
    </>
  )
}

export function PaperDetailPage() {
  const { paperId = '' } = useParams()
  const { user } = useAuth()

  const query = useQuery({
    queryKey: paperKeys.detail(paperId),
    queryFn: () => papersApi.get(paperId),
  })

  let body
  if (query.isPending) {
    body = <PageLoading />
  } else if (query.isError) {
    const status = query.error instanceof ApiError ? query.error.status : 0

    if (status === 404) {
      body = (
        <MessagePanel
          title="Paper not found"
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
    body = <PaperDetail paper={query.data} currentUserId={user?.id} />
  }

  const backTo = query.data ? `/projects/${query.data.projectId}` : '/'
  const backLabel = query.data ? '← Back to project' : '← All projects'

  return (
    <div>
      <Link to={backTo} className="text-sm text-ink-muted hover:text-ink">
        {backLabel}
      </Link>
      <div className="mt-4">{body}</div>
    </div>
  )
}