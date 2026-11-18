import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { paperKeys, papersApi } from '../api/papers'
import { taskKeys, tasksApi } from '../api/tasks'
import type { CreateResearchTaskRequest, ProjectMember } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { TASK_FIELDS, emptyTaskValues, toTaskDetails } from '../forms/taskForm'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { SelectField } from './SelectField'
import { TaskDetailsFields } from './TaskDetailsFields'

interface NewTaskFormProps {
  projectId: string
  members: ProjectMember[]
  currentUserId?: string
  onDone: () => void
}

function NewTaskForm({ projectId, members, currentUserId, onDone }: NewTaskFormProps) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(emptyTaskValues)
  const [paperId, setPaperId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  // Same query key as the Papers tab, so this is usually already in the cache.
  const papers = useQuery({
    queryKey: paperKeys.list(projectId),
    queryFn: () => papersApi.listForProject(projectId),
  })
  const sortedPapers = [...(papers.data ?? [])].sort((a, b) => a.title.localeCompare(b.title))

  const create = useMutation({
    mutationFn: (body: CreateResearchTaskRequest) => tasksApi.create(projectId, body),
    // Mark the task lists stale and wait for the refresh, so the new task is on screen before the dialog closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await create.mutateAsync({
        ...toTaskDetails(values),
        paperId: paperId || null,
        assignedToUserId: assigneeId || null,
      })
      onDone()
    } catch (error) {
      setErrors(toFormErrors(error, TASK_FIELDS))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={errors.form} />

      <TaskDetailsFields
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        errors={errors.fields}
      />

      <SelectField
        label="Assignee"
        name="assignedToUserId"
        value={assigneeId}
        onChange={(e) => setAssigneeId(e.target.value)}
        error={errors.fields.assignedToUserId}
      >
        <option value="">Unassigned</option>
        {members.map((member) => (
          <option key={member.userId} value={member.userId}>
            {member.displayName}
            {member.userId === currentUserId ? ' (you)' : ''}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="Linked paper"
        name="paperId"
        value={paperId}
        onChange={(e) => setPaperId(e.target.value)}
        disabled={!papers.isSuccess}
        error={errors.fields.paperId}
        hint={
          papers.isError
            ? "Couldn't load this project's papers. You can still create the task without a link."
            : 'Optional. Link the task to a paper in this project.'
        }
      >
        <option value="">{papers.isPending ? 'Loading papers…' : 'No linked paper'}</option>
        {sortedPapers.map((paper) => (
          <option key={paper.id} value={paper.id}>
            {paper.title}
          </option>
        ))}
      </SelectField>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          Create task
        </Button>
      </div>
    </form>
  )
}

interface NewTaskDialogProps extends Omit<NewTaskFormProps, 'onDone'> {
  open: boolean
  onClose: () => void
}

export function NewTaskDialog({ open, onClose, ...formProps }: NewTaskDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add task">
      <NewTaskForm {...formProps} onDone={onClose} />
    </Modal>
  )
}