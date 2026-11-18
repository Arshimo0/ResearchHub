import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { noteKeys, notesApi } from '../api/notes'
import type { Note } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { TextAreaField } from './TextAreaField'

function EditNoteForm({ note, onDone }: { note: Note; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState(note.content)
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const save = useMutation({
    mutationFn: (text: string) => notesApi.update(note.id, { content: text }),
    // Refresh whether the save worked or failed, so the list behind never shows something false.
    onSettled: () => queryClient.invalidateQueries({ queryKey: noteKeys.list(note.paperId) }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    const text = content.trim()

    // The API marks a note "edited" on every update, so do not send one that changes nothing.
    if (text === note.content) {
      onDone()
      return
    }

    try {
      await save.mutateAsync(text)
      onDone()
    } catch (error) {
      setErrors(toFormErrors(error, ['content']))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={errors.form} />

      <TextAreaField
        label="Note"
        name="content"
        rows={5}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        error={errors.fields.content}
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

interface EditNoteDialogProps {
  note: Note | null
  onClose: () => void
}

export function EditNoteDialog({ note, onClose }: EditNoteDialogProps) {
  return (
    <Modal open={note !== null} onClose={onClose} title="Edit note">
      {note ? <EditNoteForm note={note} onDone={onClose} /> : null}
    </Modal>
  )
}