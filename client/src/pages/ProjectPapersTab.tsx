import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { errorMessage } from '../api/client'
import { paperKeys, papersApi } from '../api/papers'
import type { Paper } from '../api/types'
import { Button } from '../components/Button'
import { DeletePaperDialog } from '../components/DeletePaperDialog'
import { EditPaperDialog } from '../components/EditPaperDialog'
import { ErrorPanel } from '../components/ErrorPanel'
import { NewPaperDialog } from '../components/NewPaperDialog'
import { PageLoading } from '../components/PageLoading'
import { PaperCard } from '../components/PaperCard'
import { PaperFilterBar } from '../components/PaperFilterBar'
import { parseApiDate } from '../lib/format'
import { filterFromSearchParams, filterToSearchParams, hasActiveFilters } from '../lib/paperFilter'
import { useProject } from './projectContext'

export function ProjectPapersTab() {
  const { project } = useProject()
  const [searchParams, setSearchParams] = useSearchParams()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Paper | null>(null)
  const [deleting, setDeleting] = useState<Paper | null>(null)

  // The address holds the filters, so they survive a reload, work with the back button, and can be shared.
  const filter = filterFromSearchParams(searchParams)
  const filterKey = filterToSearchParams(filter).toString()
  const filtering = hasActiveFilters(filter)

  const query = useQuery({
    queryKey: paperKeys.list(project.id, filter),
    queryFn: () => papersApi.listForProject(project.id, filter),
    // While new results load, keep showing the current list instead of flashing a spinner.
    placeholderData: keepPreviousData,
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
    body = filtering ? (
      <div className="rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
        <h3 className="text-lg font-semibold">No papers match these filters</h3>
        <p className="mt-1 text-sm text-ink-muted">Try different values, or clear the filters.</p>
      </div>
    ) : (
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
            <PaperCard
              paper={paper}
              onEdit={() => setEditing(paper)}
              onDelete={() => setDeleting(paper)}
            />
          </li>
        ))}
      </ul>
    )
  }

  const refreshing = query.isPlaceholderData

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold tracking-tight">
          Papers{query.isSuccess ? ` (${papers.length})` : ''}
        </h2>
        <Button onClick={() => setAdding(true)}>Add paper</Button>
      </div>

      <div className="mt-4">
        <PaperFilterBar
          key={filterKey}
          filter={filter}
          onApply={(next) => setSearchParams(filterToSearchParams(next))}
          onClear={() => setSearchParams({})}
        />
      </div>

      <div
        aria-busy={refreshing}
        className={`mt-4 transition-opacity ${refreshing ? 'opacity-60' : ''}`}
      >
        {body}
      </div>

      <NewPaperDialog projectId={project.id} open={adding} onClose={() => setAdding(false)} />
      <EditPaperDialog paper={editing} onClose={() => setEditing(null)} />
      <DeletePaperDialog paper={deleting} onClose={() => setDeleting(null)} />
    </section>
  )
}