import type { ProjectStatus } from '../api/types'
import { Badge } from './Badge'

const statusTone = {
  Active: 'accent',
  Completed: 'neutral',
  Archived: 'warning',
} as const satisfies Record<ProjectStatus, 'accent' | 'neutral' | 'warning'>

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <Badge tone={statusTone[status]}>{status}</Badge>
}