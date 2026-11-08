import { describe, expect, it } from 'vitest'
import {
  filterFromSearchParams,
  filterToSearchParams,
  hasActiveFilters,
  normalizeFilter,
} from './paperFilter'

describe('normalizeFilter', () => {
  it('trims values and lowercases the tag, as the API does', () => {
    expect(normalizeFilter({ tag: '  NLP ', author: ' Vaswani ' })).toEqual({
      tag: 'nlp',
      author: 'Vaswani',
    })
  })

  it('drops empty values', () => {
    expect(normalizeFilter({ tag: '   ', author: '', from: '', to: ' ' })).toEqual({})
  })

  it('drops anything that is not a real calendar date', () => {
    expect(normalizeFilter({ from: 'yesterday', to: '2017-02-30' })).toEqual({})
    expect(normalizeFilter({ from: '2017-1-5' })).toEqual({})
    expect(normalizeFilter({ from: '0000-01-01' })).toEqual({})
  })

  it('keeps valid dates, including a leap day', () => {
    expect(normalizeFilter({ from: '2020-02-29', to: '2024-12-31' })).toEqual({
      from: '2020-02-29',
      to: '2024-12-31',
    })
  })
})

describe('filterFromSearchParams', () => {
  it('reads the known keys and ignores everything else', () => {
    const params = new URLSearchParams('tag=NLP&author=van+der+Berg&from=2017-01-01&bogus=1&to=nope')

    expect(filterFromSearchParams(params)).toEqual({
      tag: 'nlp',
      author: 'van der Berg',
      from: '2017-01-01',
    })
  })
})

describe('filterToSearchParams', () => {
  it('writes only the active filters, in a stable order', () => {
    const params = filterToSearchParams({ to: '2017-12-31', author: 'van der Berg', tag: 'nlp' })

    expect(params.toString()).toBe('tag=nlp&author=van+der+Berg&to=2017-12-31')
  })

  it('round-trips through the address', () => {
    const filter = { tag: 'nlp', author: 'Vaswani', from: '2017-01-01', to: '2017-12-31' }

    expect(filterFromSearchParams(filterToSearchParams(filter))).toEqual(filter)
  })
})

describe('hasActiveFilters', () => {
  it('is true only when at least one filter is set', () => {
    expect(hasActiveFilters({})).toBe(false)
    expect(hasActiveFilters({ author: 'Ana' })).toBe(true)
  })
})