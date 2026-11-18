import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { taskKeys, tasksApi } from '../api/tasks'
import type { ResearchTask, UpdateResearchTaskRequest } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { TASK_FIELDS, taskToFormValues, toTaskDetails } from '../forms/taskForm'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { TaskDetailsFields } from './TaskDetailsFields'

function EditTaskForm({ task, onDone }: { task: ResearchTask; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(() => taskToFormValues(task))
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const save = useMutation({
    mutationFn: (body: UpdateResearchTaskRequest) => tasksApi.update(task.id, body),
    // Refresh whether it worked or failed, so the list behind never shows something false.
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    const details = toTaskDetails(values)

    // Nothing changed, so there is nothing to send.
    if (JSON.stringify(details) === JSON.stringify(toTaskDetails(taskToFormValues(task)))) {
      onDone()
      return
    }

    try {
      await save.mutateAsync(details)
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

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

interface EditTaskDialogProps {
  task: ResearchTask | null
  onClose: () => void
}

export function EditTaskDialog({ task, onClose }: EditTaskDialogProps) {
  return (
    <Modal open={task !== null} onClose={onClose} title="Edit task">
      {task ? <EditTaskForm task={task} onDone={onClose} /> : null}
    </Modal>
  )
}