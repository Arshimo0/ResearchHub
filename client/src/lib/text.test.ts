import { describe, expect, it } from 'vitest'
import { snippet } from './text'

describe('snippet', () => {
  it('keeps short text as it is', () => {
    expect(snippet('First thought')).toBe('First thought')
  })

  it('collapses line breaks and runs of spaces into single spaces', () => {
    expect(snippet('  Line one\n\n  line   two ')).toBe('Line one line two')
  })

  it('cuts long text and marks the cut', () => {
    expect(snippet('a'.repeat(50))).toBe(`${'a'.repeat(40)}…`)
  })
})