import type { Paper, UpdatePaperRequest } from '../api/types'

export interface PaperFormValues {
  title: string
  authors: string
  abstract: string
  publicationDate: string
  doiOrUrl: string
  pdfReference: string
}

export const emptyPaperValues: PaperFormValues = {
  title: '',
  authors: '',
  abstract: '',
  publicationDate: '',
  doiOrUrl: '',
  pdfReference: '',
}

export const PAPER_FIELDS = [
  'title',
  'authors',
  'abstract',
  'publicationDate',
  'doiOrUrl',
  'pdfReference',
  'tags',
] as const

export function paperToFormValues(paper: Paper): PaperFormValues {
  return {
    title: paper.title,
    authors: paper.authors,
    abstract: paper.abstract,
    // A date input wants yyyy-mm-dd. Slicing the text avoids any time zone conversion.
    publicationDate: paper.publicationDate?.slice(0, 10) ?? '',
    doiOrUrl: paper.doiOrUrl ?? '',
    pdfReference: paper.pdfReference ?? '',
  }
}

export function toPaperDetails(values: PaperFormValues): UpdatePaperRequest {
  return {
    title: values.title.trim(),
    authors: values.authors.trim(),
    abstract: values.abstract.trim(),
    publicationDate: values.publicationDate || null,
    doiOrUrl: values.doiOrUrl.trim() || null,
    pdfReference: values.pdfReference.trim() || null,
  }
}