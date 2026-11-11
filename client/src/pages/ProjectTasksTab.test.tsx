import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { tasksApi } from '../api/tasks'
import type { Project, ResearchTask } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import type { ProjectContext } from './projectContext'
import { ProjectTasksTab } from './ProjectTasksTab'

const project: Project = {
  id: 'p1',
  name: 'AI Research',
  description: '',
  status: 'Active',
  createdAt: '2026-10-01T10:00:00Z',
  members: [{ userId: 'u1', displayName: 'Ana', role: 'Owner', joinedAt: '2026-10-01T10:00:00Z' }],
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

function renderTab() {
  const context: ProjectContext = { project, currentUserId: 'u1', isOwner: true }

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