import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { notesApi } from '../api/notes'
import { papersApi } from '../api/papers'
import type { Paper, User } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import { PaperDetailPage } from './PaperDetailPage'

const ana: User = { id: 'u1', email: 'ana@example.com', displayName: 'Ana', role: 'User' }

const paper = (): Paper => ({
  id: 'pa1',
  projectId: 'p1',
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.; Shazeer, N.',
  abstract: 'We propose the Transformer, a model architecture based solely on attention.',
  publicationDate: '2017-06-12T00:00:00',
  doiOrUrl: '10.48550/arXiv.1706.03762',
  pdfReference: null,
  addedByUserId: 'u1',
  addedByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  tags: [{ id: 't1', name: 'transformers' }],
})

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/papers/:paperId" element={<PaperDetailPage />} />
    </Routes>,
    { route: '/papers/pa1', user: ana },
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('PaperDetailPage', () => {
  it('shows the whole paper with its notes, and links back to the project', async () => {
    const get = vi.spyOn(papersApi, 'get').mockResolvedValue(paper())
    vi.spyOn(notesApi, 'list').mockResolvedValue([])

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Attention Is All You Need' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('pa1')
    expect(screen.getByText(/Vaswani, A\./)).toBeInTheDocument()
    expect(screen.getByText(/Published .*2017/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Abstract' })).toBeInTheDocument()
    expect(screen.getByText(/based solely on attention/)).toBeInTheDocument()
    expect(screen.getByText('transformers')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Open source of Attention Is All You Need' })).toHaveAttribute(
      'href',
      'https://doi.org/10.48550/arXiv.1706.03762',
    )
    expect(screen.getByRole('link', { name: /Back to project/ })).toHaveAttribute('href', '/projects/p1')
    expect(await screen.findByRole('heading', { name: 'Notes (0)' })).toBeInTheDocument()
  })

  it('says so when the paper does not exist', async () => {
    vi.spyOn(papersApi, 'get').mockRejectedValue(
      new ApiError(404, { title: 'Not Found', status: 404 }, 'Paper not found.'),
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Paper not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /All projects/ })).toHaveAttribute('href', '/')
  })

  it('says so when the user is not a member of the paper’s project', async () => {
    vi.spyOn(papersApi, 'get').mockRejectedValue(
      new ApiError(403, { title: 'Forbidden', status: 403 }, 'You are not a member of this project.'),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { name: "You're not a member of this project" }),
    ).toBeInTheDocument()
  })

  it('shows other errors with a retry that recovers', async () => {
    const get = vi
      .spyOn(papersApi, 'get')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce(paper())
    vi.spyOn(notesApi, 'list').mockResolvedValue([])
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'Attention Is All You Need' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
  })
})