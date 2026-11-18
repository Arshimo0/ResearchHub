import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { paperKeys, papersApi } from '../api/papers'
import { taskKeys } from '../api/tasks'
import type { Paper } from '../api/types'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'

function DeletePaperContent({ paper, onClose }: { paper: Paper; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Tasks linked to this paper lose their link when it is deleted, so cached task lists are stale too.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: paperKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    ])

  const remove = useMutation({
    mutationFn: () => papersApi.remove(paper.id),
    onSuccess: refresh,
  })

  async function handleDelete() {
    setError(null)

    try {
      await remove.mutateAsync()
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // Someone else already deleted it, which is the result we wanted.
        await refresh()
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
        This permanently deletes <strong className="text-ink">{paper.title}</strong> and its notes. Tasks
        linked to it are kept and just lose the link. This can't be undone.
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

interface DeletePaperDialogProps {
  paper: Paper | null
  onClose: () => void
}

export function DeletePaperDialog({ paper, onClose }: DeletePaperDialogProps) {
  return (
    <Modal open={paper !== null} onClose={onClose} title="Delete this paper?">
      {paper ? <DeletePaperContent paper={paper} onClose={onClose} /> : null}
    </Modal>
  )
}