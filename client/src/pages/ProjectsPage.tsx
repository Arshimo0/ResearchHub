import { useQuery } from '@tanstack/react-query'
import { errorMessage } from '../api/client'
import { projectKeys, projectsApi } from '../api/projects'
import { ErrorPanel } from '../components/ErrorPanel'
import { PageLoading } from '../components/PageLoading'
import { ProjectCard } from '../components/ProjectCard'

export function ProjectsPage() {
  const query = useQuery({
    queryKey: projectKeys.list(),
    queryFn: () => projectsApi.list(),
  })

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Your projects</h1>

      <div className="mt-6">
        {query.isPending ? (
          <PageLoading />
        ) : query.isError ? (
          <ErrorPanel message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        ) : query.data.length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-8 text-center backdrop-blur-md">
            <h2 className="text-lg font-semibold">No projects yet</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Create your first project to start collecting papers with your team.
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
    </div>
  )
}