import { describe, expect, it } from 'vitest'
import type { Paper } from '../api/types'
import { emptyPaperValues, paperToFormValues, toPaperDetails } from './paperForm'

const paper: Paper = {
  id: 'pa1',
  projectId: 'p1',
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.',
  abstract: 'We propose the Transformer.',
  publicationDate: '2017-06-12T00:00:00',
  doiOrUrl: '10.48550/arXiv.1706.03762',
  pdfReference: null,
  addedByUserId: 'u1',
  addedByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  tags: [],
}

describe('paperToFormValues', () => {
  it('fills the form from a paper, keeping the calendar date as written', () => {
    expect(paperToFormValues(paper)).toEqual({
      title: 'Attention Is All You Need',
      authors: 'Vaswani, A.',
      abstract: 'We propose the Transformer.',
      publicationDate: '2017-06-12',
      doiOrUrl: '10.48550/arXiv.1706.03762',
      pdfReference: '',
    })
  })

  it('shows missing optional values as empty fields', () => {
    const values = paperToFormValues({ ...paper, publicationDate: null, doiOrUrl: null })

    expect(values.publicationDate).toBe('')
    expect(values.doiOrUrl).toBe('')
    expect(values.pdfReference).toBe('')
  })
})

describe('toPaperDetails', () => {
  it('trims text and turns empty optional fields into null', () => {
    expect(
      toPaperDetails({
        ...emptyPaperValues,
        title: '  A title  ',
        authors: ' Ana ',
        abstract: '  ',
        doiOrUrl: '   ',
      }),
    ).toEqual({
      title: 'A title',
      authors: 'Ana',
      abstract: '',
      publicationDate: null,
      doiOrUrl: null,
      pdfReference: null,
    })
  })

  it('keeps a chosen date and the optional values', () => {
    expect(
      toPaperDetails({
        ...emptyPaperValues,
        title: 'T',
        publicationDate: '2017-06-12',
        doiOrUrl: ' 10.1000/x ',
        pdfReference: 'https://example.com/p.pdf',
      }),
    ).toMatchObject({
      publicationDate: '2017-06-12',
      doiOrUrl: '10.1000/x',
      pdfReference: 'https://example.com/p.pdf',
    })
  })
})