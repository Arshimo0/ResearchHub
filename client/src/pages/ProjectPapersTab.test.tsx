import { screen, waitFor, within } from '@testing-library/react'
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

describe('PDF references', () => {
  it('links a PDF address and shows anything else as plain text', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([
      paper({ id: 'a', title: 'With PDF', pdfReference: 'https://example.com/paper.pdf' }),
      paper({ id: 'b', title: 'Odd PDF', pdfReference: 'javascript:alert(1)' }),
    ])

    renderTab()

    const good = within(await screen.findByRole('article', { name: 'With PDF' }))
    expect(good.getByRole('link', { name: 'Open PDF of With PDF' })).toHaveAttribute(
      'href',
      'https://example.com/paper.pdf',
    )

    const odd = within(screen.getByRole('article', { name: 'Odd PDF' }))
    expect(odd.queryByRole('link', { name: /Open PDF/ })).not.toBeInTheDocument()
    expect(odd.getByText('PDF: javascript:alert(1)')).toBeInTheDocument()
  })
})

async function openAddDialog(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Add paper' }))
  return screen.findByRole('dialog', { name: 'Add paper' })
}

describe('adding a paper', () => {
  it('saves the paper with normalised tags and shows it in the refreshed list', async () => {
    const list = vi
      .spyOn(papersApi, 'listForProject')
      .mockResolvedValueOnce([])
      .mockResolvedValue([paper()])
    const create = vi.spyOn(papersApi, 'create').mockResolvedValue(paper())
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No papers yet')

    const dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Title'), '  Attention Is All You Need ')
    await user.type(dialog.getByLabelText('Authors'), 'Vaswani, A.')
    await user.type(dialog.getByLabelText('Publication date'), '2017-06-12')
    await user.type(dialog.getByLabelText('DOI or URL'), '10.48550/arXiv.1706.03762')
    // The last tag is never confirmed with Enter. Clicking Save must still keep it.
    await user.type(dialog.getByLabelText('Tags'), 'Transformers{Enter}NLP')
    await user.click(dialog.getByRole('button', { name: 'Save paper' }))

    expect(await screen.findByRole('article', { name: 'Attention Is All You Need' })).toBeInTheDocument()
    expect(create).toHaveBeenCalledWith('p1', {
      title: 'Attention Is All You Need',
      authors: 'Vaswani, A.',
      abstract: '',
      publicationDate: '2017-06-12',
      doiOrUrl: '10.48550/arXiv.1706.03762',
      pdfReference: null,
      tags: ['transformers', 'nlp'],
    })
    expect(list).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())
  })

  it('shows the API error under the right input and keeps what was typed', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'create').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { title: ["'Title' must not be empty."] } },
        'Validation failed',
      ),
    )
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No papers yet')

    const dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Authors'), 'Vaswani, A.')
    await user.click(dialog.getByRole('button', { name: 'Save paper' }))

    expect(await dialog.findByText("'Title' must not be empty.")).toBeInTheDocument()
    expect(dialog.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(dialog.getByLabelText('Authors')).toHaveValue('Vaswani, A.')
  })

  it('discards the draft, tags included, when cancelled', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No papers yet')

    let dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Title'), 'Half-finished')
    await user.type(dialog.getByLabelText('Tags'), 'draft{Enter}')
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())

    dialog = within(await openAddDialog(user))
    expect(dialog.getByLabelText('Title')).toHaveValue('')
    expect(dialog.queryByRole('button', { name: 'Remove tag draft' })).not.toBeInTheDocument()
  })
})