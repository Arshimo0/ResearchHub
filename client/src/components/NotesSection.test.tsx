import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { notesApi } from '../api/notes'
import type { Note } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import { NotesSection } from './NotesSection'

const note = (overrides: Partial<Note> = {}): Note => ({
  id: 'n1',
  paperId: 'pa1',
  authorId: 'u1',
  authorName: 'Ana',
  content: 'First thought',
  createdAt: '2026-10-01T10:00:00Z',
  updatedAt: null,
  ...overrides,
})

function renderNotes() {
  return renderWithProviders(<NotesSection paperId="pa1" currentUserId="u1" />)
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('NotesSection', () => {
  it('lists the notes in the order the API gave, marking your own and edited ones', async () => {
    const list = vi.spyOn(notesApi, 'list').mockResolvedValue([
      note(),
      note({
        id: 'n2',
        authorId: 'u2',
        authorName: 'Sam',
        content: 'Line one\nLine two',
        createdAt: '2026-10-02T10:00:00Z',
        updatedAt: '2026-10-03T10:00:00Z',
      }),
    ])

    renderNotes()

    expect(await screen.findByRole('heading', { name: 'Notes (2)' })).toBeInTheDocument()
    expect(list).toHaveBeenCalledWith('pa1')

    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)

    expect(within(items[0]).getByText('Ana')).toBeInTheDocument()
    expect(within(items[0]).getByText('(you)')).toBeInTheDocument()
    expect(within(items[0]).getByText(/First thought/)).toBeInTheDocument()
    expect(within(items[0]).queryByText(/Edited/)).not.toBeInTheDocument()

    expect(within(items[1]).getByText('Sam')).toBeInTheDocument()
    expect(within(items[1]).queryByText('(you)')).not.toBeInTheDocument()
    expect(within(items[1]).getByText(/Line one Line two/)).toBeInTheDocument()
    expect(within(items[1]).getByText(/Edited/)).toBeInTheDocument()
  })

  it('invites the first note when there are none', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([])

    renderNotes()

    expect(await screen.findByText('No notes yet. Be the first to add one.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notes (0)' })).toBeInTheDocument()
  })

  it('shows the error and recovers when the user retries', async () => {
    const list = vi
      .spyOn(notesApi, 'list')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce([note()])
    const user = userEvent.setup()

    renderNotes()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load notes")
    expect(alert).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('First thought')).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('adds a note, shows it in the refreshed list, and clears the box', async () => {
    const list = vi
      .spyOn(notesApi, 'list')
      .mockResolvedValueOnce([])
      .mockResolvedValue([note({ content: 'A fresh idea' })])
    const create = vi.spyOn(notesApi, 'create').mockResolvedValue(note({ content: 'A fresh idea' }))
    const user = userEvent.setup()

    renderNotes()
    await screen.findByText('No notes yet. Be the first to add one.')

    const box = screen.getByLabelText('Add a note')
    await user.type(box, '  A fresh idea  ')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    expect(await screen.findByText('A fresh idea')).toBeInTheDocument()
    expect(create).toHaveBeenCalledWith('pa1', { content: 'A fresh idea' })
    expect(list).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(box).toHaveValue(''))
  })

  it('shows the API message under the box and keeps what was typed', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([])
    vi.spyOn(notesApi, 'create').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { content: ["'Content' must not be empty."] } },
        'Validation failed',
      ),
    )
    const user = userEvent.setup()

    renderNotes()
    await screen.findByText('No notes yet. Be the first to add one.')

    await user.type(screen.getByLabelText('Add a note'), 'Draft thought')
    await user.click(screen.getByRole('button', { name: 'Add note' }))

    expect(await screen.findByText("'Content' must not be empty.")).toBeInTheDocument()
    expect(screen.getByLabelText('Add a note')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Add a note')).toHaveValue('Draft thought')
  })
})
type UserSession = ReturnType<typeof userEvent.setup>

const OWN = 'First thought'

async function openEdit(user: UserSession) {
  await user.click(await screen.findByRole('button', { name: `Edit your note: ${OWN}` }))
  return screen.findByRole('dialog', { name: 'Edit note' })
}

async function openDelete(user: UserSession) {
  await user.click(await screen.findByRole('button', { name: `Delete your note: ${OWN}` }))
  return screen.findByRole('dialog', { name: 'Delete this note?' })
}

describe('permissions on notes', () => {
  it('offers edit and delete only on your own notes, and says why other notes have none', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([
      note(),
      note({ id: 'n2', authorId: 'u2', authorName: 'Sam', content: 'Sam thought' }),
    ])

    renderNotes()

    expect(await screen.findByRole('button', { name: `Edit your note: ${OWN}` })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Delete your note: ${OWN}` })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^(Edit|Delete) your note/ })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /Sam thought/ })).not.toBeInTheDocument()
    expect(screen.getByText("Only a note's author can edit or delete it.")).toBeInTheDocument()
  })

  it('does not show the hint when every note is your own', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([note()])

    renderNotes()

    await screen.findByRole('button', { name: `Edit your note: ${OWN}` })
    expect(screen.queryByText("Only a note's author can edit or delete it.")).not.toBeInTheDocument()
  })
})

describe('editing a note', () => {
  it('opens with the current text, saves the change, and shows it as edited', async () => {
    const edited = note({ content: 'Revised', updatedAt: '2026-10-05T10:00:00Z' })
    const list = vi.spyOn(notesApi, 'list').mockResolvedValueOnce([note()]).mockResolvedValue([edited])
    const update = vi.spyOn(notesApi, 'update').mockResolvedValue(edited)
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openEdit(user))

    const box = dialog.getByLabelText('Note')
    expect(box).toHaveValue(OWN)
    await user.clear(box)
    await user.type(box, '  Revised  ')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Revised')).toBeInTheDocument()
    expect(screen.getByText(/Edited/)).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith('n1', { content: 'Revised' })
    expect(list).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByLabelText('Note')).not.toBeInTheDocument())
  })

  it('sends nothing when the text did not change, so no false "edited" label appears', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([note()])
    const update = vi.spyOn(notesApi, 'update')
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openEdit(user))

    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(screen.queryByLabelText('Note')).not.toBeInTheDocument())
    expect(update).not.toHaveBeenCalled()
    expect(screen.queryByText(/Edited/)).not.toBeInTheDocument()
  })

  it('shows the API message under the box and keeps what was typed', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([note()])
    vi.spyOn(notesApi, 'update').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { content: ["'Content' must not be empty."] } },
        'Validation failed',
      ),
    )
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openEdit(user))

    await user.clear(dialog.getByLabelText('Note'))
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await dialog.findByText("'Content' must not be empty.")).toBeInTheDocument()
    expect(dialog.getByLabelText('Note')).toHaveAttribute('aria-invalid', 'true')
  })

  it('refreshes the list when the note turns out to be gone', async () => {
    const list = vi.spyOn(notesApi, 'list').mockResolvedValueOnce([note()]).mockResolvedValue([])
    vi.spyOn(notesApi, 'update').mockRejectedValue(
      new ApiError(404, { title: 'Not Found', status: 404 }, 'Note not found.'),
    )
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openEdit(user))

    await user.type(dialog.getByLabelText('Note'), ' more')
    await user.click(dialog.getByRole('button', { name: 'Save changes' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('Note not found.')
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
    expect(await screen.findByText('No notes yet. Be the first to add one.')).toBeInTheDocument()
  })

  it('discards the draft when cancelled', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([note()])
    const update = vi.spyOn(notesApi, 'update')
    const user = userEvent.setup()

    renderNotes()
    let dialog = within(await openEdit(user))

    await user.type(dialog.getByLabelText('Note'), ' (draft)')
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByLabelText('Note')).not.toBeInTheDocument())

    dialog = within(await openEdit(user))
    expect(dialog.getByLabelText('Note')).toHaveValue(OWN)
    expect(update).not.toHaveBeenCalled()
  })
})

describe('deleting a note', () => {
  it('asks for confirmation, then deletes and refreshes the list', async () => {
    const list = vi.spyOn(notesApi, 'list').mockResolvedValueOnce([note()]).mockResolvedValue([])
    const remove = vi.spyOn(notesApi, 'remove').mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openDelete(user))

    expect(dialog.getByText(OWN)).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    await user.click(dialog.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('No notes yet. Be the first to add one.')).toBeInTheDocument()
    expect(remove).toHaveBeenCalledWith('n1')
    expect(list).toHaveBeenCalledTimes(2)
  })

  it('does nothing when cancelled', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([note()])
    const remove = vi.spyOn(notesApi, 'remove')
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openDelete(user))
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete this note?' })).not.toBeInTheDocument(),
    )
    expect(remove).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Notes (1)' })).toBeInTheDocument()
  })

  it('treats a note that is already gone as deleted, without an error', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValueOnce([note()]).mockResolvedValue([])
    vi.spyOn(notesApi, 'remove').mockRejectedValue(
      new ApiError(404, { title: 'Not Found', status: 404 }, 'Note not found.'),
    )
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openDelete(user))
    await user.click(dialog.getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('No notes yet. Be the first to add one.')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows why it failed and keeps the note', async () => {
    vi.spyOn(notesApi, 'list').mockResolvedValue([note()])
    vi.spyOn(notesApi, 'remove').mockRejectedValue(new ApiError(500, null, 'Request failed (500)'))
    const user = userEvent.setup()

    renderNotes()
    const dialog = within(await openDelete(user))
    await user.click(dialog.getByRole('button', { name: 'Delete permanently' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('Request failed (500)')
    expect(screen.getByRole('heading', { name: 'Notes (1)' })).toBeInTheDocument()
  })
})