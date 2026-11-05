import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { papersApi } from '../api/papers'
import type { Paper, Project } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import type { ProjectContext } from './projectContext'
import { ProjectPapersTab } from './ProjectPapersTab'

const project: Project = {
  id: 'p1',
  name: 'AI Research',
  description: '',
  status: 'Active',
  createdAt: '2026-10-01T10:00:00Z',
  members: [{ userId: 'u1', displayName: 'Ana', role: 'Owner', joinedAt: '2026-10-01T10:00:00Z' }],
}

const paper = (overrides: Partial<Paper> = {}): Paper => ({
  id: 'pa1',
  projectId: 'p1',
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.; Shazeer, N.',
  abstract: 'We propose the Transformer.',
  publicationDate: '2017-06-12T00:00:00',
  doiOrUrl: '10.48550/arXiv.1706.03762',
  pdfReference: null,
  addedByUserId: 'u1',
  addedByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  tags: [
    { id: 't1', name: 'transformers' },
    { id: 't2', name: 'nlp' },
  ],
  ...overrides,
})

function renderTab() {
  const context: ProjectContext = { project, currentUserId: 'u1', isOwner: true }

  return renderWithProviders(
    <Routes>
      <Route element={<Outlet context={context} />}>
        <Route path="/" element={<ProjectPapersTab />} />
      </Route>
    </Routes>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectPapersTab', () => {
  it('asks for the papers of this project and shows what each one has', async () => {
    const list = vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])

    renderTab()

    const card = within(await screen.findByRole('article', { name: 'Attention Is All You Need' }))
    expect(list).toHaveBeenCalledWith('p1')
    expect(screen.getByRole('heading', { name: 'Papers (1)' })).toBeInTheDocument()
    expect(card.getByText(/Vaswani, A\./)).toBeInTheDocument()
    expect(card.getByText(/Published .*2017/)).toBeInTheDocument()
    expect(card.getByText('We propose the Transformer.')).toBeInTheDocument()
    expect(card.getByText(/Added by Ana/)).toBeInTheDocument()

    const tags = within(card.getByRole('list', { name: 'Tags' }))
    expect(tags.getByText('transformers')).toBeInTheDocument()
    expect(tags.getByText('nlp')).toBeInTheDocument()
  })

  it('shows the newest paper first, whatever order the API used', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([
      paper({ id: 'a', title: 'Older paper', createdAt: '2026-09-01T10:00:00Z' }),
      paper({ id: 'b', title: 'Newest paper', createdAt: '2026-10-05T10:00:00Z' }),
      paper({ id: 'c', title: 'Middle paper', createdAt: '2026-09-20T10:00:00' }),
    ])

    renderTab()

    await screen.findByRole('article', { name: 'Newest paper' })
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Newest paper', 'Middle paper', 'Older paper'])
  })

  it('shows an empty state when the project has no papers', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])

    renderTab()

    expect(await screen.findByText('No papers yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Papers (0)' })).toBeInTheDocument()
  })

  it('shows the error and recovers when the user retries', async () => {
    const list = vi
      .spyOn(papersApi, 'listForProject')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce([paper()])
    const user = userEvent.setup()

    renderTab()

    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load papers")
    expect(screen.getByRole('alert')).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('article', { name: 'Attention Is All You Need' })).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('turns a DOI into a link that opens safely in a new tab', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])

    renderTab()

    const link = await screen.findByRole('link', { name: 'Open source of Attention Is All You Need' })
    expect(link).toHaveAttribute('href', 'https://doi.org/10.48550/arXiv.1706.03762')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('never turns a hostile source into a link, and shows it as plain text', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([
      paper({ title: 'Hostile entry', doiOrUrl: 'javascript:alert(1)' }),
    ])

    renderTab()

    const card = within(await screen.findByRole('article', { name: 'Hostile entry' }))
    expect(card.queryByRole('link')).not.toBeInTheDocument()
    expect(card.getByText('javascript:alert(1)')).toBeInTheDocument()
  })
})