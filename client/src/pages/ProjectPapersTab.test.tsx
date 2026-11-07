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
const TITLE = 'Attention Is All You Need'
type UserSession = ReturnType<typeof userEvent.setup>

async function openEditDialog(user: UserSession) {
  await user.click(await screen.findByRole('button', { name: `Edit ${TITLE}` }))
  return screen.findByRole('dialog', { name: 'Edit paper' })
}

async function openDeleteDialog(user: UserSession) {
  await user.click(await screen.findByRole('button', { name: `Delete ${TITLE}` }))
  return screen.findByRole('dialog', { name: 'Delete this paper?' })
}

describe('editing a paper', () => {
  it('opens with the current values and saves the details', async () => {
    const list = vi
      .spyOn(papersApi, 'listForProject')
      .mockResolvedValueOnce([paper()])
      .mockResolvedValue([paper({ title: 'Attention Revisited' })])
    const update = vi.spyOn(papersApi, 'update').mockResolvedValue(paper({ title: 'Attention Revisited' }))
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openEditDialog(user))

    expect(dialog.getByLabelText('Title')).toHaveValue(TITLE)
    expect(dialog.getByLabelText('Authors')).toHaveValue('Vaswani, A.; Shazeer, N.')
    expect(dialog.getByLabelText('Publication date')).toHaveValue('2017-06-12')
    expect(dialog.getByLabelText('DOI or URL')).toHaveValue('10.48550/arXiv.1706.03762')
    expect(dialog.getByLabelText('PDF link')).toHaveValue('')
    expect(dialog.getByRole('button', { name: 'Remove tag transformers' })).toBeInTheDocument()

    const title = dialog.getByLabelText('Title')
    await user.clear(title)
    await user.type(title, 'Attention Revisited')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('article', { name: 'Attention Revisited' })).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith('pa1', {
      title: 'Attention Revisited',
      authors: 'Vaswani, A.; Shazeer, N.',
      abstract: 'We propose the Transformer.',
      publicationDate: '2017-06-12',
      doiOrUrl: '10.48550/arXiv.1706.03762',
      pdfReference: null,
    })
    expect(list).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())
  })

  it('shows the API error under the right input and keeps what was typed', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])
    vi.spyOn(papersApi, 'update').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { title: ["'Title' must not be empty."] } },
        'Validation failed',
      ),
    )
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openEditDialog(user))

    await user.clear(dialog.getByLabelText('Title'))
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await dialog.findByText("'Title' must not be empty.")).toBeInTheDocument()
    expect(dialog.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(dialog.getByLabelText('Authors')).toHaveValue('Vaswani, A.; Shazeer, N.')
  })

  it('saves tag changes together with the details, and not before', async () => {
    const updated = paper({
      tags: [
        { id: 't2', name: 'nlp' },
        { id: 't3', name: 'attention' },
      ],
    })
    vi.spyOn(papersApi, 'listForProject').mockResolvedValueOnce([paper()]).mockResolvedValue([updated])
    const update = vi.spyOn(papersApi, 'update').mockResolvedValue(paper())
    const addTag = vi.spyOn(papersApi, 'addTag').mockResolvedValue(updated)
    const removeTag = vi.spyOn(papersApi, 'removeTag').mockResolvedValue(updated)
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openEditDialog(user))

    await user.click(dialog.getByRole('button', { name: 'Remove tag transformers' }))
    await user.type(dialog.getByLabelText('Tags'), 'Attention{Enter}')

    expect(addTag).not.toHaveBeenCalled()
    expect(removeTag).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())

    expect(update).toHaveBeenCalledTimes(1)
    expect(addTag).toHaveBeenCalledWith('pa1', { name: 'attention' })
    expect(removeTag).toHaveBeenCalledWith('pa1', 't1')

    const card = within(screen.getByRole('article', { name: TITLE }))
    expect(card.getByText('attention')).toBeInTheDocument()
    expect(card.queryByText('transformers')).not.toBeInTheDocument()
  })

  it('says the details were saved when the tags could not be updated', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])
    const update = vi.spyOn(papersApi, 'update').mockResolvedValue(paper())
    vi.spyOn(papersApi, 'addTag').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { name: ['Tag name is too long.'] } },
        'Validation failed',
      ),
    )
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openEditDialog(user))

    await user.type(dialog.getByLabelText('Tags'), 'whatever{Enter}')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent(
      'Your changes to the details were saved, but the tags could not be updated: Tag name is too long.',
    )
    expect(update).toHaveBeenCalledTimes(1)
    expect(dialog.getByRole('button', { name: 'Remove tag whatever' })).toBeInTheDocument()
  })

  it('discards every change when cancelled', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])
    const update = vi.spyOn(papersApi, 'update')
    const user = userEvent.setup()

    renderTab()
    let dialog = within(await openEditDialog(user))

    await user.type(dialog.getByLabelText('Title'), ' (draft)')
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())

    dialog = within(await openEditDialog(user))
    expect(dialog.getByLabelText('Title')).toHaveValue(TITLE)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('deleting a paper', () => {
  it('asks for confirmation, then deletes and refreshes the list', async () => {
    const list = vi
      .spyOn(papersApi, 'listForProject')
      .mockResolvedValueOnce([paper()])
      .mockResolvedValue([])
    const remove = vi.spyOn(papersApi, 'remove').mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openDeleteDialog(user))

    expect(dialog.getByText(TITLE)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('No papers yet')).toBeInTheDocument()
    expect(remove).toHaveBeenCalledWith('pa1')
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('does nothing when cancelled', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])
    const remove = vi.spyOn(papersApi, 'remove')
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openDeleteDialog(user))
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete this paper?' })).not.toBeInTheDocument(),
    )
    expect(remove).not.toHaveBeenCalled()
    expect(screen.getByRole('article', { name: TITLE })).toBeInTheDocument()
  })

  it('treats a paper someone else already deleted as gone, without an error', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValueOnce([paper()]).mockResolvedValue([])
    vi.spyOn(papersApi, 'remove').mockRejectedValue(
      new ApiError(404, { title: 'Not Found', status: 404 }, 'Paper not found.'),
    )
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openDeleteDialog(user))
    await user.click(dialog.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('No papers yet')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows why it failed and keeps the paper', async () => {
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paper()])
    vi.spyOn(papersApi, 'remove').mockRejectedValue(new ApiError(500, null, 'Request failed (500)'))
    const user = userEvent.setup()

    renderTab()
    const dialog = within(await openDeleteDialog(user))
    await user.click(dialog.getByRole('button', { name: 'Delete permanently' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('Request failed (500)')
    expect(screen.getByRole('article', { name: TITLE })).toBeInTheDocument()
  })
})