import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { errorMessage } from '../api/client'
import { projectKeys, projectsApi } from '../api/projects'
import { Button } from '../components/Button'
import { ErrorPanel } from '../components/ErrorPanel'
import { NewProjectDialog } from '../components/NewProjectDialog'
import { PageLoading } from '../components/PageLoading'
import { ProjectCard } from '../components/ProjectCard'

export function ProjectsPage() {
  const [creating, setCreating] = useState(false)
  const query = useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.list(),
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>
        <Button onClick={() => setCreating(true)}>New project</Button>
      </div>

      <div className="mt-6">
        {query.isPending ? (
          <PageLoading />
        ) : query.isError ? (
          <ErrorPanel message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
            <h2 className="text-lg font-semibold">No projects yet</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Use "New project" to create your first one and start collecting papers with your team.
            </p>
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {query.data.map((project) => (
              <li key={project.id} className="flex">
                <ProjectCard project={project} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewProjectDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}