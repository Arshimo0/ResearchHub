import { describe, expect, it } from 'vitest'
import { externalLink } from './links'

describe('externalLink', () => {
  it('keeps web links', () => {
    expect(externalLink('https://arxiv.org/abs/1512.03385')).toBe('https://arxiv.org/abs/1512.03385')
    expect(externalLink('  http://example.com/paper  ')).toBe('http://example.com/paper')
  })

  it('turns a DOI, with or without a "doi:" prefix, into a doi.org link', () => {
    expect(externalLink('10.48550/arXiv.1706.03762')).toBe('https://doi.org/10.48550/arXiv.1706.03762')
    expect(externalLink('doi:10.1000/xyz123')).toBe('https://doi.org/10.1000/xyz123')
  })

  it('rejects dangerous or unsupported schemes', () => {
    expect(externalLink('javascript:alert(1)')).toBeNull()
    expect(externalLink('JaVaScRiPt:alert(1)')).toBeNull()
    expect(externalLink('data:text/html,<script>alert(1)</script>')).toBeNull()
    expect(externalLink('ftp://example.com/paper.pdf')).toBeNull()
  })

  it('rejects text that is not an address', () => {
    expect(externalLink('see the lab wiki')).toBeNull()
    expect(externalLink('')).toBeNull()
    expect(externalLink('//evil.example/x')).toBeNull()
  })
})