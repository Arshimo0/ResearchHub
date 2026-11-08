import type { PaperFilter } from '../api/types'

// The address bar and the API use the same parameter names, so one set of helpers serves both.
const KEYS = ['tag', 'author', 'from', 'to'] as const

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  if (Number(value.slice(0, 4)) < 1) return false

  // A date like 2017-02-30 rolls over to March, so it will not match what was typed.
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Cleans filter input: trims, lowercases the tag as the API does, and drops anything empty or not a real date. */
export function normalizeFilter(raw: PaperFilter): PaperFilter {
  const filter: PaperFilter = {}

  const tag = raw.tag?.trim().toLowerCase()
  if (tag) filter.tag = tag

  const author = raw.author?.trim()
  if (author) filter.author = author

  const from = raw.from?.trim()
  if (from && isCalendarDate(from)) filter.from = from

  const to = raw.to?.trim()
  if (to && isCalendarDate(to)) filter.to = to

  return filter
}

/** The address bar is user-controlled, so read only the known keys and clean them. */
export function filterFromSearchParams(params: URLSearchParams): PaperFilter {
  return normalizeFilter({
    tag: params.get('tag') ?? undefined,
    author: params.get('author') ?? undefined,
    from: params.get('from') ?? undefined,
    to: params.get('to') ?? undefined,
  })
}

/** Only active filters are written, always in the same order. */
export function filterToSearchParams(filter: PaperFilter): URLSearchParams {
  const params = new URLSearchParams()

  for (const key of KEYS) {
    const value = filter[key]
    if (value) params.set(key, value)
  }

  return params
}

export function hasActiveFilters(filter: PaperFilter): boolean {
  return KEYS.some((key) => Boolean(filter[key]))
}