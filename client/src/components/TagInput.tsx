import { useId, useState, type KeyboardEvent } from 'react'

export const MAX_TAGS = 20
export const MAX_TAG_LENGTH = 100

const normalizeTag = (raw: string) => raw.trim().toLowerCase()

interface TagInputProps {
  label: string
  value: string[]
  onChange: (tags: string[]) => void
  error?: string
  hint?: string
}

export function TagInput({ label, value, onChange, error, hint }: TagInputProps) {
  const id = useId()
  const errorId = `${id}-error`
  const hintId = `${id}-hint`
  const [draft, setDraft] = useState('')
  const full = value.length >= MAX_TAGS

  function addTags(raws: string[]) {
    const next = [...value]
    for (const raw of raws) {
      const tag = normalizeTag(raw)
      if (tag && next.length < MAX_TAGS && !next.includes(tag)) next.push(tag)
    }
    if (next.length !== value.length) onChange(next)
  }

  function handleChange(text: string) {
    if (!text.includes(',')) {
      setDraft(text)
      return
    }

    // Typing or pasting commas finishes every tag before the last comma.
    const parts = text.split(',')
    addTags(parts.slice(0, -1))
    setDraft(parts[parts.length - 1])
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      // Enter adds a tag. It must never submit the form around it.
      event.preventDefault()
      addTags([draft])
      setDraft('')
    } else if (event.key === 'Backspace' && draft === '' && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  function handleBlur() {
    // Do not lose a tag that was typed but never confirmed.
    addTags([draft])
    setDraft('')
  }

  const message = full ? `You have reached the limit of ${MAX_TAGS} tags.` : hint

  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-ink-muted">
        {label}
      </label>

      <div
        className={`flex flex-wrap items-center gap-2 rounded-control border bg-surface-raised px-2 py-2 focus-within:ring-2 focus-within:ring-accent ${error ? 'border-danger' : 'border-line'}`}
      >
        {value.length > 0 ? (
          <ul aria-label="Selected tags" className="contents">
            {value.map((tag) => (
              <li
                key={tag}
                className="inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 py-0.5 pr-1 pl-2.5 text-xs font-medium text-accent"
              >
                {tag}
                <button
                  type="button"
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => onChange(value.filter((t) => t !== tag))}
                  className="flex size-4 items-center justify-center rounded-full hover:bg-accent/20"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <input
          id={id}
          value={draft}
          disabled={full}
          maxLength={MAX_TAG_LENGTH}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : message ? hintId : undefined}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {error ? (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : message ? (
        <p id={hintId} className="mt-1 text-xs text-ink-faint">
          {message}
        </p>
      ) : null}
    </div>
  )
}