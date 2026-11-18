import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { taskKeys, tasksApi } from '../api/tasks'
import type { ProjectMember, ResearchTask } from '../api/types'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { SelectField } from './SelectField'

interface AssignTaskFormProps {
  task: ResearchTask
  members: ProjectMember[]
  currentUserId?: string
  onDone: () => void
}

function AssignTaskForm({ task, members, currentUserId, onDone }: AssignTaskFormProps) {
  const queryClient = useQueryClient()
  const [assigneeId, setAssigneeId] = useState(task.assignedToUserId ?? '')
  const [error, setError] = useState<string | null>(null)

  // The API keeps a task's assignee when they leave the project. Keep them selectable, so the form tells the truth.
  const former =
    task.assignedToUserId !== null && !members.some((m) => m.userId === task.assignedToUserId)
      ? { id: task.assignedToUserId, name: task.assignedToName ?? 'Unknown user' }
      : null

  const save = useMutation({
    mutationFn: (userId: string | null) => tasksApi.assign(task.id, userId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    // Nothing changed, so there is nothing to send.
    if (assigneeId === (task.assignedToUserId ?? '')) {
      onDone()
      return
    }

    try {
      await save.mutateAsync(assigneeId || null)
      onDone()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={error} />

      <SelectField
        label="Assignee"
        name="userId"
        hint="Only project members can be assigned."
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
      >
        <option value="">Unassigned</option>
        {former ? <option value={former.id}>{`${former.name} (no longer a member)`}</option> : null}
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.displayName}
            {member.userId === currentUserId ? ' (you)' : ''}
          </option>
        ))}
      </SelectField>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save assignee
        </Button>
      </div>
    </form>
  )
}

interface AssignTaskDialogProps {
  task: ResearchTask | null
  members: ProjectMember[]
  currentUserId?: string
  onClose: () => void
}

export function AssignTaskDialog({ task, members, currentUserId, onClose }: AssignTaskDialogProps) {
  return (
    <Modal open={task !== null} onClose={onClose} title="Assign task">
      {task ? (
        <AssignTaskForm task={task} members={members} currentUserId={currentUserId} onDone={onClose} />
      ) : null}
    </Modal>
  )
}