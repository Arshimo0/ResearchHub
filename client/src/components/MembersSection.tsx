import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { projectsApi } from '../api/projects'
import type { Project } from '../api/types'
import { useApplyProject } from '../api/useApplyProject'
import { formatDate } from '../lib/format'
import { AddMemberForm } from './AddMemberForm'
import { Badge } from './Badge'
import { Button } from './Button'
import { FormError } from './FormError'

interface MembersSectionProps {
  project: Project
  currentUserId?: string
  isOwner: boolean
}

export function MembersSection({ project, currentUserId, isOwner }: MembersSectionProps) {
  const applyProject = useApplyProject()
  const [removeError, setRemoveError] = useState<string | null>(null)

  const removeMember = useMutation({
    mutationFn: (userId: string) => projectsApi.removeMember(project.id, userId),
    onSuccess: applyProject,
  })

  async function handleRemove(userId: string) {
    setRemoveError(null)

    try {
      await removeMember.mutateAsync(userId)
    } catch (error) {
      setRemoveError(errorMessage(error))
    }
  }

  return (
    <section className="mt-6 rounded-card border border-line bg-surface p-6 backdrop-blur-md">
      <h2 className="text-lg font-semibold tracking-tight">Members ({project.members.length})</h2>

      {isOwner ? <AddMemberForm projectId={project.id} /> : null}

      <div className="mt-4">
        <FormError message={removeError} />
      </div>

      <ul aria-label="Members" className="mt-2 divide-y divide-line">
        {project.members.map((member) => (
          <li key={member.userId} className="flex items-center justify-between gap-4 py-3">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="flex size-9 items-center justify-center rounded-full bg-accent/15 text-sm font-semibold text-accent"
              >
                {member.displayName.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div>
                <p className="font-medium">
                  {member.displayName}
                  {member.userId === currentUserId ? (
                    <span className="ml-2 text-xs font-normal text-ink-faint">(you)</span>
                  ) : null}
                </p>
                <p className="text-xs text-ink-faint">Joined {formatDate(member.joinedAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge tone={member.role === 'Owner' ? 'accent' : 'neutral'}>{member.role}</Badge>
              {/* No remove button on your own row: leaving a project is a different feature. */}
              {isOwner && member.userId !== currentUserId ? (
                <Button
                  variant="dangerGhost"
                  size="sm"
                  aria-label={`Remove ${member.displayName}`}
                  disabled={removeMember.isPending}
                  onClick={() => void handleRemove(member.userId)}
                >
                  Remove
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}