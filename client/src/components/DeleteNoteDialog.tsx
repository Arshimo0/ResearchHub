import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ApiError, errorMessage } from '../api/client'
import { noteKeys, notesApi } from '../api/notes'
import type { Note } from '../api/types'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'

function DeleteNoteContent({ note, onClose }: { note: Note; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const remove = useMutation({
    mutationFn: () => notesApi.remove(note.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.list(note.paperId) }),
  })

  async function handleDelete() {
    setError(null)

    try {
      await remove.mutateAsync()
      onClose()
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        // It is already gone, which is the result we wanted.
        await queryClient.invalidateQueries({ queryKey: noteKeys.list(note.paperId) })
        onClose()
        return
      }
      setError(errorMessage(e))
    }
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <p className="text-ink-muted">This permanently deletes your note. This can't be undone.</p>
      <p className="line-clamp-4 whitespace-pre-line rounded-control border border-line bg-surface-raised p-3 text-sm text-ink-muted">
        {note.content}
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

interface DeleteNoteDialogProps {
  note: Note | null
  onClose: () => void
}

export function DeleteNoteDialog({ note, onClose }: DeleteNoteDialogProps) {
  return (
    <Modal open={note !== null} onClose={onClose} title="Delete this note?">
      {note ? <DeleteNoteContent note={note} onClose={onClose} /> : null}
    </Modal>
  )
}