import { useQuery } from '@tanstack/react-query'
import { errorMessage } from '../api/client'
import { paperKeys, papersApi } from '../api/papers'
import { ErrorPanel } from '../components/ErrorPanel'
import { PageLoading } from '../components/PageLoading'
import { PaperCard } from '../components/PaperCard'
import { parseApiDate } from '../lib/format'
import { useProject } from './projectContext'

export function ProjectPapersTab() {
  const { project } = useProject()

  const query = useQuery({
    queryKey: paperKeys.list(project.id),
    queryFn: () => papersApi.listForProject(project.id),
  })

  if (query.isPending) return <PageLoading />

  if (query.isError) {
    return (
      <ErrorPanel
        title="Couldn't load papers"
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  }

  // The API does not promise an order, so show the newest first.
  const papers = [...query.data].sort(
    (a, b) => parseApiDate(b.createdAt).getTime() - parseApiDate(a.createdAt).getTime(),
  )

  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">Papers ({papers.length})</h2>

      {papers.length === 0 ? (
        <div className="mt-4 rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
          <h3 className="text-lg font-semibold">No papers yet</h3>
          <p className="mt-1 text-sm text-ink-muted">Papers added to this project will appear here.</p>
        </div>
      ) : (
        <ul className="mt-4 space-y-4">
          {papers.map((paper) => (
            <li key={paper.id}>
              <PaperCard paper={paper} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}