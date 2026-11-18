import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { taskKeys, tasksApi } from '../api/tasks'
import type { ResearchTask } from '../api/types'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'

function DeleteTaskContent({ task, onClose }: { task: ResearchTask; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: () => tasksApi.remove(task.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })

  async function handleDelete() {
    setError(null)

    try {
      await remove.mutateAsync()
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // It is already gone, which is the result we wanted.
        await queryClient.invalidateQueries({ queryKey: taskKeys.all })
        onClose()
        return
      }
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <p className="text-ink-muted">
        This permanently deletes <strong className="text-ink">{task.title}</strong>. This can't be undone.
      </p>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={remove.isPending} onClick={() => void handleDelete()}>
          Delete permanently
        </Button>
      </div>
    </div>
  )
}

interface DeleteTaskDialogProps {
  task: ResearchTask | null
  onClose: () => void
}

export function DeleteTaskDialog({ task, onClose }: DeleteTaskDialogProps) {
  return (
    <Modal open={task !== null} onClose={onClose} title="Delete this task?">
      {task ? <DeleteTaskContent task={task} onClose={onClose} /> : null}
    </Modal>
  )
}