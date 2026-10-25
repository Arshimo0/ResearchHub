import { describe, expect, it } from 'vitest'
import { formatDate } from './format'

describe('formatDate', () => {
  it('treats a timestamp without a zone as UTC, as the API sends them after a database read', () => {
    expect(formatDate('2026-10-01T23:30:00')).toBe(formatDate('2026-10-01T23:30:00Z'))
  })

  it('returns an empty string for a value that is not a date', () => {
    expect(formatDate('not a date')).toBe('')
  })
})