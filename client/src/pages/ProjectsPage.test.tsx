import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { projectsApi } from '../api/projects'
import type { ProjectSummary } from '../api/types'
import { renderWithProviders } from '../test/renderWithProviders'
import { ProjectsPage } from './ProjectsPage'

const summary = (overrides: Partial<ProjectSummary> = {}): ProjectSummary => ({
  id: 'p1',
  name: 'AI Research',
  description: 'Studying CV models',
  status: 'Active',
  createdAt: '2026-10-01T10:00:00Z',
  memberCount: 3,
  myRole: 'Owner',
  ...overrides,
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ProjectsPage', () => {
  it('lists the projects the user belongs to', async () => {
    vi.spyOn(projectsApi, 'list').mockResolvedValue([
      summary(),
      summary({ id: 'p2', name: 'NLP Reading Group', memberCount: 1, myRole: 'Member', status: 'Archived' }),
    ])

    renderWithProviders(<ProjectsPage />)

    expect(await screen.findByRole('heading', { name: 'AI Research' })).toBeInTheDocument()
    expect(screen.getByText('3 members')).toBeInTheDocument()
    expect(screen.getByText('You are the owner')).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'NLP Reading Group' })).toBeInTheDocument()
    expect(screen.getByText('1 member')).toBeInTheDocument()
    expect(screen.getByText('You are a member')).toBeInTheDocument()
    expect(screen.getByText('Archived')).toBeInTheDocument()
  })

  it('shows an empty state when there are no projects', async () => {
    vi.spyOn(projectsApi, 'list').mockResolvedValue([])

    renderWithProviders(<ProjectsPage />)

    expect(await screen.findByText('No projects yet')).toBeInTheDocument()
  })

  it('shows the error and recovers when the user retries', async () => {
    const list = vi
      .spyOn(projectsApi, 'list')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce([summary()])
    const user = userEvent.setup()

    renderWithProviders(<ProjectsPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('heading', { name: 'AI Research' })).toBeInTheDocument()
    expect(list).toHaveBeenCalledTimes(2)
  })
})