import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { papersApi } from '../api/papers'
import { projectsApi } from '../api/projects'
import type { Paper, ProjectSummary } from '../api/types'
import { SEARCH_RESULT_LIMIT } from '../lib/search'
import { renderWithProviders } from '../test/renderWithProviders'
import { SearchPage } from './SearchPage'

const paper = (overrides: Partial<Paper> = {}): Paper => ({
  id: 'pa1',
  projectId: 'p1',
  title: 'Attention Is All You Need',
  authors: 'Vaswani, A.',
  abstract: 'We propose the Transformer.',
  publicationDate: '2017-06-12T00:00:00',
  doiOrUrl: null,
  pdfReference: null,
  addedByUserId: 'u1',
  addedByName: 'Ana',
  createdAt: '2026-10-01T10:00:00Z',
  tags: [],
  ...overrides,
})

const summary = (id: string, name: string): ProjectSummary => ({
  id,
  name,
  description: '',
  status: 'Active',
  createdAt: '2026-10-01T10:00:00Z',
  memberCount: 1,
  myRole: 'Owner',
})

function renderSearch(route: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/search" element={<SearchPage />} />
    </Routes>,
    { route },
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('SearchPage', () => {
  it('explains how to search when there is no query, without asking the API', async () => {
    const search = vi.spyOn(papersApi, 'search').mockResolvedValue([])

    renderSearch('/search')

    expect(await screen.findByRole('heading', { name: 'Search your papers' })).toBeInTheDocument()
    expect(search).not.toHaveBeenCalled()
  })

  it.each([
    ['/search?q=a', 'Search text must be at least 2 characters.'],
    [`/search?q=${'a'.repeat(101)}`, 'Search text can be at most 100 characters.'],
  ])('refuses %# without asking the API', async (route, message) => {
    const search = vi.spyOn(papersApi, 'search').mockResolvedValue([])

    renderSearch(route)

    expect(await screen.findByRole('heading', { name: 'Check your search' })).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
    expect(search).not.toHaveBeenCalled()
  })

  it('searches for the cleaned-up text and links each result to its project', async () => {
    const search = vi.spyOn(papersApi, 'search').mockResolvedValue([
      paper({ id: 'a', title: 'First hit', projectId: 'p1' }),
      paper({ id: 'b', title: 'Second hit', projectId: 'p2' }),
    ])
    vi.spyOn(projectsApi, 'list').mockResolvedValue([
      summary('p1', 'AI Research'),
      summary('p2', 'NLP Reading Group'),
    ])

    renderSearch('/search?q=++attention++is+')

    expect(await screen.findByRole('article', { name: 'First hit' })).toBeInTheDocument()
    expect(search).toHaveBeenCalledWith('attention is')
    expect(screen.getByText('2 results for “attention is”')).toBeInTheDocument()
    expect(screen.queryByText(/Only the first/)).not.toBeInTheDocument()

    // The API's order is kept.
    const titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['First hit', 'Second hit'])

    expect(await screen.findByRole('link', { name: 'AI Research' })).toHaveAttribute('href', '/projects/p1')
    expect(screen.getByRole('link', { name: 'NLP Reading Group' })).toHaveAttribute('href', '/projects/p2')

    // Results are read-only. Changing a paper happens in its project.
    expect(screen.queryByRole('button', { name: /^(Edit|Delete) / })).not.toBeInTheDocument()
  })

  it('says that only the first five words are used', async () => {
    vi.spyOn(papersApi, 'search').mockResolvedValue([])

    renderSearch('/search?q=one+two+three+four+five+six')

    expect(await screen.findByText('Only the first 5 words are used.')).toBeInTheDocument()
  })

  it('warns that there may be more results when the cap is reached', async () => {
    const many = Array.from({ length: SEARCH_RESULT_LIMIT }, (_, i) =>
      paper({ id: `id${i}`, title: `Paper ${i}` }),
    )
    vi.spyOn(papersApi, 'search').mockResolvedValue(many)
    vi.spyOn(projectsApi, 'list').mockResolvedValue([summary('p1', 'AI Research')])

    renderSearch('/search?q=paper')

    expect(await screen.findAllByRole('article')).toHaveLength(SEARCH_RESULT_LIMIT)
    expect(
      screen.getByText('Showing the 50 newest matches. There may be more, so add words to narrow your search.'),
    ).toBeInTheDocument()
  })

  it('says so when nothing matches', async () => {
    vi.spyOn(papersApi, 'search').mockResolvedValue([])
    vi.spyOn(projectsApi, 'list').mockResolvedValue([])

    renderSearch('/search?q=zzz+qq')

    expect(await screen.findByRole('heading', { name: 'No papers found' })).toBeInTheDocument()
    expect(screen.getByText(/Nothing in your projects matches “zzz qq”/)).toBeInTheDocument()
  })

  it('shows the error and recovers when the user retries', async () => {
    const search = vi
      .spyOn(papersApi, 'search')
      .mockRejectedValueOnce(new ApiError(500, null, 'Request failed (500)'))
      .mockResolvedValueOnce([paper()])
    vi.spyOn(projectsApi, 'list').mockResolvedValue([])
    const user = userEvent.setup()

    renderSearch('/search?q=attention')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent("Couldn't search")
    expect(alert).toHaveTextContent('Request failed (500)')

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByRole('article', { name: 'Attention Is All You Need' })).toBeInTheDocument()
    expect(search).toHaveBeenCalledTimes(2)
  })

  it('still shows results, with a generic link, when the project names cannot be loaded', async () => {
    vi.spyOn(papersApi, 'search').mockResolvedValue([paper()])
    vi.spyOn(projectsApi, 'list').mockRejectedValue(new ApiError(500, null, 'Request failed (500)'))

    renderSearch('/search?q=attention')

    expect(await screen.findByRole('article', { name: 'Attention Is All You Need' })).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Open project' })).toHaveAttribute('href', '/projects/p1')
  })
})