import { useState, type FormEvent } from 'react'
import type { PaperFilter } from '../api/types'
import { hasActiveFilters, normalizeFilter } from '../lib/paperFilter'
import { Button } from './Button'
import { TextField } from './TextField'

interface PaperFilterBarProps {
  filter: PaperFilter
  onApply: (filter: PaperFilter) => void
  onClear: () => void
}

export function PaperFilterBar({ filter, onApply, onClear }: PaperFilterBarProps) {
  const [tag, setTag] = useState(filter.tag ?? '')
  const [author, setAuthor] = useState(filter.author ?? '')
  const [from, setFrom] = useState(filter.from ?? '')
  const [to, setTo] = useState(filter.to ?? '')
  const [rangeError, setRangeError] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = normalizeFilter({ tag, author, from, to })

    // Dates in yyyy-mm-dd form sort correctly as plain text.
    if (next.from && next.to && next.from > next.to) {
      setRangeError('The start date must be on or before the end date.')
      return
    }

    setRangeError(undefined)
    onApply(next)
  }

  return (
    <form
      aria-label="Filter papers"
      onSubmit={handleSubmit}
      noValidate
      className="rounded-card border border-line bg-surface p-4 backdrop-blur-md"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Tag"
          name="tag"
          autoComplete="off"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
        />
        <TextField
          label="Author"
          name="author"
          autoComplete="off"
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
        <TextField
          label="Published from"
          type="date"
          name="from"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          label="Published to"
          type="date"
          name="to"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          error={rangeError}
        />
      </div>

      <div className="mt-4 flex gap-3">
        <Button type="submit">Apply filters</Button>
        {hasActiveFilters(filter) ? (
          <Button variant="ghost" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
      </div>
    </form>
  )
}