import { useId, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { normalizeQuery } from '../lib/search'

function SearchForm({ initial }: { initial: string }) {
  const navigate = useNavigate()
  const id = useId()
  const [text, setText] = useState(initial)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = normalizeQuery(text)

    // An empty search opens the search page, which explains how to search.
    navigate(query ? `/search?${new URLSearchParams({ q: query }).toString()}` : '/search')
  }

  return (
    <form role="search" aria-label="Paper search" onSubmit={handleSubmit} className="min-w-0 flex-1 sm:max-w-sm">
      <label htmlFor={id} className="sr-only">
        Search papers
      </label>
      <input
        id={id}
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Search papers…"
        autoComplete="off"
        className="w-full rounded-control border border-line bg-surface-raised px-3 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:ring-2 focus:ring-accent focus:outline-none"
      />
    </form>
  )
}

export function SearchBox() {
  const { pathname, search } = useLocation()
  const initial = pathname === '/search' ? (new URLSearchParams(search).get('q') ?? '') : ''

  // Remount when the address changes, so the box always mirrors the current search.
  return <SearchForm key={initial} initial={initial} />
}