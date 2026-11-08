import type { Paper } from '../api/types'
import { externalLink } from '../lib/links'

/** The paper's source and PDF, linked only when the text is a safe web address or DOI. */
export function PaperLinks({ paper }: { paper: Paper }) {
  const source = paper.doiOrUrl?.trim() || null
  const sourceLink = source ? externalLink(source) : null
  const pdf = paper.pdfReference?.trim() || null
  const pdfLink = pdf ? externalLink(pdf) : null

  if (!source && !pdf) return null

  return (
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
  )
}