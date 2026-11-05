import { describe, expect, it } from 'vitest'
import { formatDate, formatPublicationDate } from './format'

describe('formatDate', () => {
  it('treats a timestamp without a zone as UTC, as the API sends them after a database read', () => {
    expect(formatDate('2026-10-01T23:30:00')).toBe(formatDate('2026-10-01T23:30:00Z'))
  })

  it('returns an empty string for a value that is not a date', () => {
    expect(formatDate('not a date')).toBe('')
  })
})

describe('formatPublicationDate', () => {
  it('shows the calendar date as written, whether or not the API included a zone', () => {
    const withoutZone = formatPublicationDate('2017-06-12T00:00:00')
    const withZone = formatPublicationDate('2017-06-12T00:00:00Z')

    expect(withoutZone).toBe(withZone)
    expect(withoutZone).toContain('12')
    expect(withoutZone).toContain('2017')
  })

  it('returns an empty string for a value that is not a date', () => {
    expect(formatPublicationDate('soon')).toBe('')
  })
})