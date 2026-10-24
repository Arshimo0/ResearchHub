import type { ProjectStatus, ProjectSummary } from '../api/types'
import { Badge } from './Badge'

const statusTone = {
  Active: 'accent',
  Completed: 'neutral',
  Archived: 'warning',
} as const satisfies Record<ProjectStatus, 'accent' | 'neutral' | 'warning'>

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const members = `${project.memberCount} ${project.memberCount === 1 ? 'member' : 'members'}`
  const role = project.myRole === 'Owner' ? 'You are the owner' : 'You are a member'

  return (
    <article className="flex w-full flex-col rounded-card border border-line bg-surface p-5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg font-semibold tracking-tight">{project.name}</h2>
        <Badge tone={statusTone[project.status]}>{project.status}</Badge>
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