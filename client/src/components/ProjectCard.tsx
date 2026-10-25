import { Link } from 'react-router'
import type { ProjectSummary } from '../api/types'
import { ProjectStatusBadge } from './ProjectStatusBadge'

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const members = `${project.memberCount} ${project.memberCount === 1 ? 'member' : 'members'}`
  const role = project.myRole === 'Owner' ? 'You are the owner' : 'You are a member'

  return (
    <article className="relative flex w-full flex-col rounded-card border border-line bg-surface p-5 backdrop-blur-md transition-colors focus-within:ring-2 focus-within:ring-accent hover:border-accent/50">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">
          {/* The link stretches over the whole card, but its accessible name is just the project name. */}
          <Link
            to={`/projects/${project.id}`}
            className="after:absolute after:inset-0 after:rounded-card focus:outline-none"
          >
            {project.name}
          </Link>
        </h2>
        <ProjectStatusBadge status={project.status} />
      </div>

      <p className="mt-2 line-clamp-3 text-sm text-ink-muted">
        {project.description || 'No description yet.'}
      </p>

      <div className="mt-auto flex items-center gap-2 pt-4 text-xs text-ink-faint">
        <span>{members}</span>
        <span aria-hidden="true">·</span>
        <span>{role}</span>
      </div>
    </article>
  )
}