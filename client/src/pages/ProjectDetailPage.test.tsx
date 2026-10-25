import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { projectsApi } from '../api/projects'
import type { Project, User } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import { ProjectDetailPage } from './ProjectDetailPage'

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

function renderPage() {
  return renderWithProviders(
    <Routes>
      <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
    </Routes>,
    { route: '/projects/p1', user: ana },
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectDetailPage', () => {
  it('shows the project and marks the current user in the member list', async () => {
    const get = vi.spyOn(projectsApi, 'get').mockResolvedValue(project())

    renderPage()

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