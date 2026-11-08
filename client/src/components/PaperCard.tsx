import { useId } from 'react'
import type { Paper } from '../api/types'
import { formatDate, formatPublicationDate } from '../lib/format'
import { externalLink } from '../lib/links'
import { Badge } from './Badge'
import { Button } from './Button'

interface PaperCardProps {
  paper: Paper
  onEdit?: () => void
  onDelete?: () => void
}

export function PaperCard({ paper, onEdit, onDelete }: PaperCardProps) {
  const titleId = useId()
  const published = paper.publicationDate ? formatPublicationDate(paper.publicationDate) : ''
  const source = paper.doiOrUrl?.trim() || null
  const sourceLink = source ? externalLink(source) : null
  const pdf = paper.pdfReference?.trim() || null
  const pdfLink = pdf ? externalLink(pdf) : null

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-card border border-line bg-surface p-5 backdrop-blur-md"
    >
    <div className="flex items-start justify-between gap-3">
     <h3 id={titleId} className="text-lg font-semibold tracking-tight">
       {paper.title}
     </h3>
        {onEdit || onDelete ? (
          <div className="flex shrink-0 gap-2">
            {onEdit ? (
              <Button variant="ghost" size="sm" aria-label={`Edit ${paper.title}`} onClick={onEdit}>
                Edit
              </Button>
            ) : null}
            {onDelete ? (
              <Button variant="dangerGhost" size="sm" aria-label={`Delete ${paper.title}`} onClick={onDelete}>
                Delete
              </Button>
            ) : null}
          </div>
        ) : null}
    </div>

      <p className="mt-1 text-sm text-ink-muted">
        {paper.authors || 'Unknown authors'}
        {published ? <span className="text-ink-faint"> · Published {published}</span> : null}
      </p>

      {paper.abstract ? (
        <p className="mt-3 line-clamp-3 text-sm text-ink-muted">{paper.abstract}</p>
      ) : null}

      {paper.tags.length > 0 ? (
        <ul aria-label="Tags" className="mt-3 flex flex-wrap gap-2">
          {paper.tags.map((tag) => (
            <li key={tag.id}>
              <Badge tone="accent">{tag.name}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-faint">
        <span>
          Added by {paper.addedByName} on {formatDate(paper.createdAt)}
        </span>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {sourceLink ? (
            <a
              href={sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open source of ${paper.title}`}
              className="text-accent hover:text-accent-strong"
            >
              Open source ↗
            </a>
          ) : source ? (
            <span>{source}</span>
          ) : null}

          {pdfLink ? (
            <a
              href={pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open PDF of ${paper.title}`}
              className="text-accent hover:text-accent-strong"
            >
              PDF ↗
            </a>
          ) : pdf ? (
            <span>PDF: {pdf}</span>
          ) : null}
        </div>
      </div>
    </article>
  )
}