import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { tasksApi } from '../api/tasks'
import type { Paper, Project, ResearchTask } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import type { ProjectContext } from './projectContext'
import { ProjectTasksTab } from './ProjectTasksTab'
import { papersApi } from '../api/papers'

const project: Project = {
  id: 'p1',
  name: 'AI Research',
  description: '',
  status: 'Active',
  createdAt: '2026-10-01T10:00:00Z',
  members: [
    { userId: 'u1', displayName: 'Ana', role: 'Owner', joinedAt: '2026-10-01T10:00:00Z' },
    { userId: 'u2', displayName: 'Sam', role: 'Member', joinedAt: '2026-10-02T10:00:00Z' },
  ],
}

const task = (overrides: Partial<ResearchTask> = {}): ResearchTask => ({
  id: 't1',
  projectId: 'p1',
  paperId: null,
  title: 'Read the paper',
  description: 'Summarise section 3',
  status: 'ToDo',
  priority: 'Medium',
  deadline: null,
  assignedToUserId: null,
  assignedToName: null,
  createdByUserId: 'u1',
  createdByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  completedAt: null,
  ...overrides,
})

function renderTab({ currentUserId = 'u1', isOwner = true } = {}) {
  const context: ProjectContext = { project, currentUserId, isOwner }

  return renderWithProviders(
    <Routes>
      <Route element={<Outlet context={context} />}>
        <Route path="/" element={<ProjectTasksTab />} />
      </Route>
    </Routes>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectTasksTab', () => {
  it('asks for this project’s tasks and groups them by status, keeping the API order', async () => {
    const list = vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([
      task({ id: 'a', title: 'Draft outline', status: 'InProgress' }),
      task({ id: 'b', title: 'Read the paper' }),
      task({ id: 'c', title: 'Collect data' }),
      task({ id: 'd', title: 'Write abstract', status: 'Done', completedAt: '2026-10-05T10:00:00Z' }),
    ])

    renderTab()

    expect(await screen.findByRole('heading', { name: 'Tasks (4)' })).toBeInTheDocument()
    expect(list).toHaveBeenCalledWith('p1')

    const groups = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(groups).toEqual(['To do (2)', 'In progress (1)', 'Done (1)'])

    const titles = screen.getAllByRole('heading', { level: 4 }).map((h) => h.textContent)
    expect(titles).toEqual(['Read the paper', 'Collect data', 'Draft outline', 'Write abstract'])
  })

  it('leaves out groups that have no tasks', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([task({ status: 'Done' })])

    renderTab()

    await screen.findByRole('heading', { name: 'Tasks (1)' })
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(['Done (1)'])
  })

  it('shows priority, assignee, deadline, creator and the linked paper on each task', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([
      task({
        id: 'a',
        title: 'Draft outline',
        priority: 'High',
        assignedToUserId: 'u2',
        assignedToName: 'Sam',
        deadline: '2999-12-31T00:00:00',
        paperId: 'pa1',
        description: 'Three sections',
      }),
      task({ id: 'b', title: 'Read the paper' }),
    ])

    renderTab()

    const full = within(await screen.findByRole('article', { name: 'Draft outline' }))
    expect(full.getByText('High priority')).toBeInTheDocument()
    expect(full.getByText('Assigned to Sam')).toBeInTheDocument()
    expect(full.getByText(/Due .*2999/)).toBeInTheDocument()
    expect(full.getByText('Three sections')).toBeInTheDocument()
    expect(full.getByText(/Created by Ana/)).toBeInTheDocument()
    expect(full.getByRole('link', { name: 'Open the paper linked to Draft outline' })).toHaveAttribute(
      'href',
      '/papers/pa1',
    )

    const bare = within(screen.getByRole('article', { name: 'Read the paper' }))
    expect(bare.getByText('Medium priority')).toBeInTheDocument()
    expect(bare.getByText('Unassigned')).toBeInTheDocument()
    expect(bare.queryByText(/Due /)).not.toBeInTheDocument()
    expect(bare.queryByRole('link')).not.toBeInTheDocument()
  })

  it('marks only an open task with a past deadline as overdue', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([
      task({ id: 'a', title: 'Late open task', deadline: '2000-01-01T00:00:00' }),
      task({
        id: 'b',
        title: 'Late but done',
        status: 'Done',
        deadline: '2000-01-01T00:00:00',
        completedAt: '2000-01-02T00:00:00Z',
      }),
      task({ id: 'c', title: 'Not due yet', deadline: '2999-12-31T00:00:00' }),
      task({ id: 'd', title: 'No deadline' }),
    ])

    renderTab()

    const late = within(await screen.findByRole('article', { name: 'Late open task' }))
    expect(late.getByText('Overdue')).toBeInTheDocument()
    expect(screen.getAllByText('Overdue')).toHaveLength(1)

    const done = within(screen.getByRole('article', { name: 'Late but done' }))
    expect(done.queryByText('Overdue')).not.toBeInTheDocument()
    expect(done.getByText(/Completed/)).toBeInTheDocument()
  })

  it('shows an empty state when the project has no tasks', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])

    renderTab()

    expect(await screen.findByText('No tasks yet')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tasks (0)' })).toBeInTheDocument()
  })

  it('shows the error and recovers when the user retries', async () => {
    const list = vi
      .spyOn(tasksApi, 'listForProject')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce([task()])
    const user = userEvent.setup()

    renderTab()

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't load tasks")
    expect(alert).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('article', { name: 'Read the paper' })).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
  })
})

const paperFixture = (): Paper => ({
  id: 'pa1',
  projectId: 'p1',
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.',
  abstract: '',
  publicationDate: null,
  doiOrUrl: null,
  pdfReference: null,
  addedByUserId: 'u1',
  addedByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  tags: [],
})

type UserSession = ReturnType<typeof userEvent.setup>

async function openAddDialog(user: UserSession) {
  await user.click(await screen.findByRole('button', { name: 'Add task' }))
  return screen.findByRole('dialog', { name: 'Add task' })
}

describe('adding a task', () => {
  it('creates a task with every field and shows it in the refreshed list', async () => {
    const created = task({ id: 'new', title: 'Draft outline', priority: 'High' })
    const list = vi.spyOn(tasksApi, 'listForProject').mockResolvedValueOnce([]).mockResolvedValue([created])
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([paperFixture()])
    const create = vi.spyOn(tasksApi, 'create').mockResolvedValue(created)
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    const dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Title'), '  Draft outline ')
    await user.type(dialog.getByLabelText('Description'), 'Three sections')
    await user.selectOptions(dialog.getByLabelText('Priority'), 'High')
    await user.type(dialog.getByLabelText('Deadline'), '2999-12-31')
    await user.selectOptions(dialog.getByLabelText('Assignee'), 'Sam')
    // The paper picker stays disabled until the papers have loaded.
    await dialog.findByRole('option', { name: 'Attention Is All You Need' })
    await user.selectOptions(dialog.getByLabelText('Linked paper'), 'Attention Is All You Need')
    await user.click(dialog.getByRole('button', { name: 'Create task' }))

    expect(await screen.findByRole('article', { name: 'Draft outline' })).toBeInTheDocument()
    expect(create).toHaveBeenCalledWith('p1', {
      title: 'Draft outline',
      description: 'Three sections',
      priority: 'High',
      deadline: '2999-12-31',
      paperId: 'pa1',
      assignedToUserId: 'u2',
    })
    expect(list).toHaveBeenCalledTimes(2)
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())
  })

  it('sends sensible defaults when only a title is given', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    const create = vi.spyOn(tasksApi, 'create').mockResolvedValue(task())
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    const dialog = within(await openAddDialog(user))
    expect(dialog.getByLabelText('Priority')).toHaveValue('Medium')
    expect(dialog.getByLabelText('Assignee')).toHaveValue('')

    await user.type(dialog.getByLabelText('Title'), 'Quick task')
    await user.click(dialog.getByRole('button', { name: 'Create task' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create).toHaveBeenCalledWith('p1', {
      title: 'Quick task',
      description: '',
      priority: 'Medium',
      deadline: null,
      paperId: null,
      assignedToUserId: null,
    })
  })

  it('offers every project member as an assignee, marking the current user', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    const dialog = within(await openAddDialog(user))
    const options = dialog.getAllByRole('option').map((option) => option.textContent)

    expect(options).toContain('Unassigned')
    expect(options).toContain('Ana (you)')
    expect(options).toContain('Sam')
  })

  it('shows the API error under the right input and keeps what was typed', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(tasksApi, 'create').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Validation failed', status: 400, errors: { title: ["'Title' must not be empty."] } },
        'Validation failed',
      ),
    )
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    const dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Description'), 'Some details')
    await user.click(dialog.getByRole('button', { name: 'Create task' }))

    expect(await dialog.findByText("'Title' must not be empty.")).toBeInTheDocument()
    expect(dialog.getByLabelText('Title')).toHaveAttribute('aria-invalid', 'true')
    expect(dialog.getByLabelText('Description')).toHaveValue('Some details')
  })

  it('shows a banner for an error that is not about one input', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(tasksApi, 'create').mockRejectedValue(
      new ApiError(
        400,
        { title: 'Bad Request', status: 400, detail: 'The assignee must be a member of this project.' },
        'The assignee must be a member of this project.',
      ),
    )
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    const dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Title'), 'Quick task')
    await user.click(dialog.getByRole('button', { name: 'Create task' }))

    expect(await dialog.findByRole('alert')).toHaveTextContent('The assignee must be a member of this project.')
  })

  it('still lets the task be created without a link when the papers cannot be loaded', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'listForProject').mockRejectedValue(new ApiError(500, null, 'Request failed (500)'))
    const create = vi.spyOn(tasksApi, 'create').mockResolvedValue(task())
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    const dialog = within(await openAddDialog(user))
    expect(await dialog.findByText(/Couldn't load this project's papers/)).toBeInTheDocument()
    expect(dialog.getByLabelText('Linked paper')).toBeDisabled()

    await user.type(dialog.getByLabelText('Title'), 'Quick task')
    await user.click(dialog.getByRole('button', { name: 'Create task' }))

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1))
    expect(create).toHaveBeenCalledWith('p1', expect.objectContaining({ title: 'Quick task', paperId: null }))
  })

  it('discards the draft when cancelled', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([])
    vi.spyOn(papersApi, 'listForProject').mockResolvedValue([])
    const create = vi.spyOn(tasksApi, 'create')
    const user = userEvent.setup()

    renderTab()
    await screen.findByText('No tasks yet')

    let dialog = within(await openAddDialog(user))
    await user.type(dialog.getByLabelText('Title'), 'Half-finished')
    await user.selectOptions(dialog.getByLabelText('Priority'), 'High')
    await user.click(dialog.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByLabelText('Title')).not.toBeInTheDocument())

    dialog = within(await openAddDialog(user))
    expect(dialog.getByLabelText('Title')).toHaveValue('')
    expect(dialog.getByLabelText('Priority')).toHaveValue('Medium')
    expect(create).not.toHaveBeenCalled()
  })
})

const HINT = "Only a task's assignee or a project owner can change its status."

describe('changing a task status', () => {
  it('moves a task to Done for an owner, and shows it in the Done group', async () => {
    const list = vi
      .spyOn(tasksApi, 'listForProject')
      .mockResolvedValueOnce([task()])
      .mockResolvedValue([task({ status: 'Done', completedAt: '2026-10-05T10:00:00Z' })])
    const change = vi.spyOn(tasksApi, 'changeStatus').mockResolvedValue(task({ status: 'Done' }))
    const user = userEvent.setup()

    renderTab()
    await user.click(await screen.findByRole('button', { name: 'Mark done: Read the paper' }))

    expect(await screen.findByRole('heading', { name: 'Done (1)' })).toBeInTheDocument()
    expect(change).toHaveBeenCalledWith('t1', 'Done')
    expect(screen.queryByRole('heading', { name: 'To do (1)' })).not.toBeInTheDocument()
    expect(screen.getByText(/Completed/)).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
    expect(screen.queryByText(HINT)).not.toBeInTheDocument()
  })

  it('offers the buttons only on tasks the user may change, and explains the rest', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([
      task({ id: 'a', title: 'Mine', assignedToUserId: 'u2', assignedToName: 'Sam' }),
      task({ id: 'b', title: 'Theirs', assignedToUserId: 'u1', assignedToName: 'Ana' }),
      task({ id: 'c', title: 'Unclaimed' }),
    ])

    renderTab({ currentUserId: 'u2', isOwner: false })

    expect(await screen.findByRole('button', { name: 'Start: Mine' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark done: Mine' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /: Theirs$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /: Unclaimed$/ })).not.toBeInTheDocument()
    expect(screen.getByText(HINT)).toBeInTheDocument()
  })

  it('shows why a change failed, keeps the task where it was, and refreshes the list', async () => {
    const list = vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([task()])
    vi.spyOn(tasksApi, 'changeStatus').mockRejectedValue(
      new ApiError(403, null, "Only the task's assignee or a project owner can change its status."),
    )
    const user = userEvent.setup()

    renderTab()
    await user.click(await screen.findByRole('button', { name: 'Start: Read the paper' }))

    const card = within(screen.getByRole('article', { name: 'Read the paper' }))
    expect(await card.findByRole('alert')).toHaveTextContent(
      "Only the task's assignee or a project owner can change its status.",
    )
    expect(screen.getByRole('heading', { name: 'To do (1)' })).toBeInTheDocument()
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2))
  })

  it('reopens a finished task as in progress', async () => {
    vi.spyOn(tasksApi, 'listForProject').mockResolvedValue([
      task({ status: 'Done', completedAt: '2026-10-05T10:00:00Z' }),
    ])
    const change = vi.spyOn(tasksApi, 'changeStatus').mockResolvedValue(task({ status: 'InProgress' }))
    const user = userEvent.setup()

    renderTab()
    expect(screen.queryByRole('button', { name: /^Start:/ })).not.toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'Reopen: Read the paper' }))

    await waitFor(() => expect(change).toHaveBeenCalledWith('t1', 'InProgress'))
  })
})