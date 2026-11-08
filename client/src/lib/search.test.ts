import { describe, expect, it } from 'vitest'
import { MAX_QUERY_LENGTH, normalizeQuery, queryProblem, wordCount } from './search'

describe('normalizeQuery', () => {
  it('trims the text and collapses runs of whitespace', () => {
    expect(normalizeQuery('  attention \t is\n all  ')).toBe('attention is all')
  })
})

describe('queryProblem', () => {
  it('accepts text within the limits', () => {
    expect(queryProblem('ab')).toBeNull()
    expect(queryProblem('a'.repeat(MAX_QUERY_LENGTH))).toBeNull()
  })

  it('rejects text that is too short', () => {
    expect(queryProblem('')).toBe('Search text must be at least 2 characters.')
    expect(queryProblem('a')).toBe('Search text must be at least 2 characters.')
  })

  it('rejects text that is too long', () => {
    expect(queryProblem('a'.repeat(MAX_QUERY_LENGTH + 1))).toBe('Search text can be at most 100 characters.')
  })
})

describe('wordCount', () => {
  it('counts the words of a normalised query', () => {
    expect(wordCount('')).toBe(0)
    expect(wordCount('one')).toBe(1)
    expect(wordCount('a b c')).toBe(3)
  })
})