import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router'
import { errorMessage } from '../api/client'
import { paperKeys, papersApi } from '../api/papers'
import { projectKeys, projectsApi } from '../api/projects'
import { ErrorPanel } from '../components/ErrorPanel'
import { PageLoading } from '../components/PageLoading'
import { PaperCard } from '../components/PaperCard'
import {
  MAX_QUERY_WORDS,
  SEARCH_RESULT_LIMIT,
  normalizeQuery,
  queryProblem,
  wordCount,
} from '../lib/search'

function Notice({ title, message }: { title: string; message: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-ink-muted">{message}</p>
    </div>
  )
}

function ProjectLabel({ projectId, name }: { projectId: string; name?: string }) {
  const to = `/projects/${projectId}`
  const linkClass = 'text-accent hover:text-accent-strong'

  return (
    <p className="mb-1 text-xs text-ink-faint">
      {name ? (
        <>
          In{' '}
          <Link to={to} className={linkClass}>
            {name}
          </Link>
        </>
      ) : (
        <Link to={to} className={linkClass}>
          Open project
        </Link>
      )}
    </p>
  )
}

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const query = normalizeQuery(searchParams.get('q') ?? '')
  const problem = query ? queryProblem(query) : null
  const canSearch = query !== '' && problem === null

  const results = useQuery({
    queryKey: paperKeys.search(query),
    queryFn: () => papersApi.search(query),
    enabled: canSearch,
  })

  // Names for the project links. If this fails, the results still show with a generic label.
  const projects = useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.list(),
    enabled: canSearch,
  })
  const projectNames = new Map<string, string>((projects.data ?? []).map((p) => [p.id, p.name] as const))

  let body
  if (query === '') {
    body = (
      <Notice
        title="Search your papers"
        message="Use the search box above to find papers by title, author or abstract across every project you belong to."
      />
    )
  } else if (problem) {
    body = <Notice title="Check your search" message={problem} />
  } else if (results.isPending) {
    body = <PageLoading />
  } else if (results.isError) {
    body = (
      <ErrorPanel
        title="Couldn't search"
        message={errorMessage(results.error)}
        onRetry={() => void results.refetch()}
      />
    )
  } else if (results.data.length === 0) {
    body = (
      <Notice
        title="No papers found"
        message={`Nothing in your projects matches “${query}”. The search looks at titles, authors and abstracts.`}
      />
    )
  } else {
    // The API returns the newest first and decides which results the cap keeps, so the order is not changed here.
    const papers = results.data

    body = (
      <>
        <p role="status" className="text-sm text-ink-muted">
          {`${papers.length} ${papers.length === 1 ? 'result' : 'results'} for “${query}”`}
        </p>
        {papers.length >= SEARCH_RESULT_LIMIT ? (
          <p className="mt-1 text-xs text-ink-faint">
            {`Showing the ${SEARCH_RESULT_LIMIT} newest matches. There may be more, so add words to narrow your search.`}
          </p>
        ) : null}

        <ul className="mt-4 space-y-6">
          {papers.map((paper) => (
            <li key={paper.id}>
              <ProjectLabel projectId={paper.projectId} name={projectNames.get(paper.projectId)} />
              <PaperCard paper={paper} />
            </li>
          ))}
        </ul>
      </>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Search</h1>

      {canSearch && wordCount(query) > MAX_QUERY_WORDS ? (
        <p className="mt-2 text-sm text-ink-faint">{`Only the first ${MAX_QUERY_WORDS} words are used.`}</p>
      ) : null}

      <div className="mt-4">{body}</div>
    </div>
  )
}