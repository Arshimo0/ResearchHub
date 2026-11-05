import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { paperKeys, papersApi } from '../api/papers'
import { Button } from '../components/Button'
import { ErrorPanel } from '../components/ErrorPanel'
import { NewPaperDialog } from '../components/NewPaperDialog'
import { PageLoading } from '../components/PageLoading'
import { PaperCard } from '../components/PaperCard'
import { parseApiDate } from '../lib/format'
import { useProject } from './projectContext'

export function ProjectPapersTab() {
  const { project } = useProject()
  const [adding, setAdding] = useState(false)

  const query = useQuery({
    queryKey: paperKeys.list(project.id),
    queryFn: () => papersApi.listForProject(project.id),
  })

  // The API does not promise an order, so show the newest first.
  const papers = query.data
    ? [...query.data].sort(
        (a, b) => parseApiDate(b.createdAt).getTime() - parseApiDate(a.createdAt).getTime(),
      )
    : []

  let body
  if (query.isPending) {
    body = <PageLoading />
  } else if (query.isError) {
    body = (
      <ErrorPanel
        title="Couldn't load papers"
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  } else if (papers.length === 0) {
    body = (
      <div className="rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
        <h3 className="text-lg font-semibold">No papers yet</h3>
        <p className="mt-1 text-sm text-ink-muted">Use "Add paper" to add the first one.</p>
      </div>
    )
  } else {
    body = (
      <ul className="space-y-4">
        {papers.map((paper) => (
          <li key={paper.id}>
            <PaperCard paper={paper} />
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Papers{query.isSuccess ? ` (${papers.length})` : ''}
        </h2>
        <Button onClick={() => setAdding(true)}>Add paper</Button>
      </div>

      <div className="mt-4">{body}</div>

      <NewPaperDialog projectId={project.id} open={adding} onClose={() => setAdding(false)} />
    </section>
  )
}