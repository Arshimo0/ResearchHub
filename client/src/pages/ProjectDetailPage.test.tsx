import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { usersApi } from '../api/users'
import { projectsApi } from '../api/projects'
import type { Project, User } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import { ProjectDetailPage } from './ProjectDetailPage'
import { ProjectMembersTab } from './ProjectMembersTab'
import { ProjectPapersTab } from './ProjectPapersTab'

const ana: User = { id: 'u1', email: 'ana@example.com', displayName: 'Ana', role: 'User' }

const project = (): Project => ({
  id: 'p1',
  name: 'AI Research',
  description: 'Studying CV models',
  status: 'Active',
  createdAt: '2026-10-01T10:00:00Z',
  members: [
    { userId: 'u1', displayName: 'Ana', role: 'Owner', joinedAt: '2026-10-01T10:00:00Z' },
    { userId: 'u2', displayName: 'Sam', role: 'Member', joinedAt: '2026-10-02T10:00:00Z' },
  ],
})

const MEMBERS = '/projects/p1/members'

function renderPage(user: User = ana, route = '/projects/p1') {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectDetailPage />}>
        <Route index element={<ProjectPapersTab />} />
        <Route path="members" element={<ProjectMembersTab />} />
      </Route>
      <Route path="/" element={<p>Projects home</p>} />
    </Routes>,
    { route, user },
  )
}
afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectDetailPage', () => {
  it('shows the project and marks the current user in the member list', async () => {
    const get = vi.spyOn(projectsApi, 'get').mockResolvedValue(project())

    renderPage(ana, MEMBERS)

    expect(await screen.findByRole('heading', { name: 'AI Research' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledWith('p1')
    expect(screen.getByText('Studying CV models')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Members (2)' })).toBeInTheDocument()

    const members = within(screen.getByRole('list', { name: 'Members' }))
    expect(members.getByText('Ana')).toBeInTheDocument()
    expect(members.getByText('(you)')).toBeInTheDocument()
    expect(members.getByText('Owner')).toBeInTheDocument()
    expect(members.getByText('Sam')).toBeInTheDocument()
    expect(members.getByText('Member')).toBeInTheDocument()
  })

  it('says so when the project does not exist, and links back to the list', async () => {
    vi.spyOn(projectsApi, 'get').mockRejectedValue(
      new ApiError(404, { title: 'Not Found', status: 404 }, 'Project not found.'),
    )

    renderPage()

    expect(await screen.findByRole('heading', { name: 'Project not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /All projects/ })).toHaveAttribute('href', '/')
  })

  it('says so when the user is not a member', async () => {
    vi.spyOn(projectsApi, 'get').mockRejectedValue(
      new ApiError(403, { title: 'Forbidden', status: 403 }, 'You are not a member of this project.'),
    )

    renderPage()

    expect(
      await screen.findByRole('heading', { name: "You're not a member of this project" }),
    ).toBeInTheDocument()
  })

  it('shows other errors with a retry that recovers', async () => {
    const get = vi
      .spyOn(projectsApi, 'get')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce(project())
    const user = userEvent.setup()

    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'AI Research' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(2)
  })
})

const sam: User = { id: 'u2', email: 'sam@example.com', displayName: 'Sam', role: 'User' }

describe('owner actions', () => {
  it('offers management actions to owners, with no remove button on their own row', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())

    renderPage(ana, MEMBERS)

    await screen.findByRole('heading', { name: 'AI Research' })
    expect(screen.getByRole('button', { name: 'Edit project' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete project' })).toBeInTheDocument()
    expect(screen.getByLabelText('Add a member by email')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remove Sam' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove Ana' })).not.toBeInTheDocument()
  })

  it('offers plain members nothing to manage', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())

    renderPage(sam, MEMBERS)

    await screen.findByRole('heading', { name: 'AI Research' })
    expect(screen.queryByRole('button', { name: 'Edit project' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete project' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Add a member by email')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Remove / })).not.toBeInTheDocument()
  })

  it('edits the project and shows the saved values without refetching', async () => {
    const get = vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    const update = vi
      .spyOn(projectsApi, 'update')
      .mockResolvedValue({ ...project(), name: 'Vision Lab', description: 'New focus' })
    const user = userEvent.setup()

    renderPage()
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.click(screen.getByRole('button', { name: 'Edit project' }))
    const dialog = await screen.findByRole('dialog', { name: 'Edit project' })

    const name = within(dialog).getByLabelText('Name')
    expect(name).toHaveValue('AI Research')
    await user.clear(name)
    await user.type(name, 'Vision Lab')

    const description = within(dialog).getByLabelText('Description')
    await user.clear(description)
    await user.type(description, 'New focus')

    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { name: 'Vision Lab' })).toBeInTheDocument()
    expect(update).toHaveBeenCalledWith('p1', { name: 'Vision Lab', description: 'New focus' })
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('adds a member by email', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    const lookup = vi
      .spyOn(usersApi, 'lookup')
      .mockResolvedValue({ id: 'u3', email: 'kim@example.com', displayName: 'Kim' })
    const withKim: Project = {
      ...project(),
      members: [
        ...project().members,
        { userId: 'u3', displayName: 'Kim', role: 'Member', joinedAt: '2026-10-03T10:00:00Z' },
      ],
    }
    const addMember = vi.spyOn(projectsApi, 'addMember').mockResolvedValue(withKim)
    const user = userEvent.setup()

    renderPage(ana, MEMBERS)
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.type(screen.getByLabelText('Add a member by email'), 'kim@example.com')
    await user.click(screen.getByRole('button', { name: 'Add member' }))

    expect(await screen.findByText('Kim')).toBeInTheDocument()
    expect(lookup).toHaveBeenCalledWith('kim@example.com')
    expect(addMember).toHaveBeenCalledWith('p1', { userId: 'u3', role: 'Member' })
    expect(screen.getByRole('heading', { name: 'Members (3)' })).toBeInTheDocument()
    expect(screen.getByLabelText('Add a member by email')).toHaveValue('')
  })

  it('explains when no account has that email, and keeps what was typed', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    vi.spyOn(usersApi, 'lookup').mockRejectedValue(
      new ApiError(404, { title: 'Not Found', status: 404 }, 'No user found with that email.'),
    )
    const addMember = vi.spyOn(projectsApi, 'addMember')
    const user = userEvent.setup()

    renderPage(ana, MEMBERS)
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.type(screen.getByLabelText('Add a member by email'), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: 'Add member' }))

    expect(await screen.findByText('No user found with that email.')).toBeInTheDocument()
    expect(screen.getByLabelText('Add a member by email')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Add a member by email')).toHaveValue('nobody@example.com')
    expect(addMember).not.toHaveBeenCalled()
  })

  it('removes a member', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    const withoutSam: Project = { ...project(), members: [project().members[0]] }
    const removeMember = vi.spyOn(projectsApi, 'removeMember').mockResolvedValue(withoutSam)
    const user = userEvent.setup()

    renderPage(ana, MEMBERS)
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.click(screen.getByRole('button', { name: 'Remove Sam' }))

    expect(await screen.findByRole('heading', { name: 'Members (1)' })).toBeInTheDocument()
    expect(removeMember).toHaveBeenCalledWith('p1', 'u2')
    expect(screen.queryByText('Sam')).not.toBeInTheDocument()
  })

  it('shows why a member could not be removed and keeps them listed', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    vi.spyOn(projectsApi, 'removeMember').mockRejectedValue(
      new ApiError(409, null, 'A project must always have at least one owner.'),
    )
    const user = userEvent.setup()

    renderPage(ana, MEMBERS)
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.click(screen.getByRole('button', { name: 'Remove Sam' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A project must always have at least one owner.')
    expect(screen.getByText('Sam')).toBeInTheDocument()
  })

  it('deletes the project after confirmation and returns to the list', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    const remove = vi.spyOn(projectsApi, 'remove').mockResolvedValue(undefined)
    const user = userEvent.setup()

    renderPage()
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.click(screen.getByRole('button', { name: 'Delete project' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this project?' })
    expect(within(dialog).getByText('AI Research')).toBeInTheDocument()
    expect(remove).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete permanently' }))

    expect(await screen.findByText('Projects home')).toBeInTheDocument()
    expect(remove).toHaveBeenCalledWith('p1')
  })

  it('does nothing when the deletion is cancelled', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    const remove = vi.spyOn(projectsApi, 'remove')
    const user = userEvent.setup()

    renderPage()
    await screen.findByRole('heading', { name: 'AI Research' })

    await user.click(screen.getByRole('button', { name: 'Delete project' }))
    const dialog = await screen.findByRole('dialog', { name: 'Delete this project?' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Delete this project?' })).not.toBeInTheDocument(),
    )
    expect(remove).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'AI Research' })).toBeInTheDocument()
  })
})

describe('project tabs', () => {
  it('opens on Papers and switches to Members without refetching the project', async () => {
    const get = vi.spyOn(projectsApi, 'get').mockResolvedValue(project())
    const user = userEvent.setup()

    renderPage()
    await screen.findByRole('heading', { name: 'AI Research' })

    const tabs = within(screen.getByRole('navigation', { name: 'Project sections' }))
    expect(tabs.getByRole('link', { name: 'Papers' })).toHaveAttribute('aria-current', 'page')
    expect(tabs.getByRole('link', { name: 'Members' })).not.toHaveAttribute('aria-current')
    expect(screen.queryByRole('list', { name: 'Members' })).not.toBeInTheDocument()

    await user.click(tabs.getByRole('link', { name: 'Members' }))

    expect(await screen.findByRole('heading', { name: 'Members (2)' })).toBeInTheDocument()
    expect(tabs.getByRole('link', { name: 'Members' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('heading', { name: 'AI Research' })).toBeInTheDocument()
    expect(get).toHaveBeenCalledTimes(1)
  })

  it('opens the Members tab directly from its address', async () => {
    vi.spyOn(projectsApi, 'get').mockResolvedValue(project())

    renderPage(ana, MEMBERS)

    expect(await screen.findByRole('heading', { name: 'Members (2)' })).toBeInTheDocument()
  })
})