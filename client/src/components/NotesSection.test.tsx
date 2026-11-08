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