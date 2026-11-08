import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { errorMessage } from '../api/client'
import { noteKeys, notesApi } from '../api/notes'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { formatDate } from '../lib/format'
import { Button } from './Button'
import { ErrorPanel } from './ErrorPanel'
import { FormError } from './FormError'
import { PageLoading } from './PageLoading'
import { TextAreaField } from './TextAreaField'

function AddNoteForm({ paperId }: { paperId: string }) {
  const queryClient = useQueryClient()
  const [content, setContent] = useState('')
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const add = useMutation({
    mutationFn: (text: string) => notesApi.create(paperId, { content: text }),
    // Mark the list stale and wait for the refresh, so the new note is on screen before the box clears.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.list(paperId) }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await add.mutateAsync(content.trim())
      setContent('')
    } catch (error) {
      setErrors(toFormErrors(error, ['content']))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      <FormError message={errors.form} />

      <TextAreaField
        label="Add a note"
        name="content"
        rows={3}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        error={errors.fields.content}
      />

      <div className="flex justify-end">
        <Button type="submit" loading={add.isPending}>
          Add note
        </Button>
      </div>
    </form>
  )
}

interface NotesSectionProps {
  paperId: string
  currentUserId?: string
}

export function NotesSection({ paperId, currentUserId }: NotesSectionProps) {
  const query = useQuery({
    queryKey: noteKeys.list(paperId),
    queryFn: () => notesApi.list(paperId),
  })

  let body
  if (query.isPending) {
    body = <PageLoading />
  } else if (query.isError) {
    body = (
      <ErrorPanel
        title="Couldn't load notes"
        message={errorMessage(query.error)}
        onRetry={() => void query.refetch()}
      />
    )
  } else if (query.data.length === 0) {
    body = <p className="text-sm text-ink-muted">No notes yet. Be the first to add one.</p>
  } else {
    // The API returns notes oldest first, in the order they were written, so the order is kept.
    body = (
      <ul aria-label="Notes" className="space-y-3">
        {query.data.map((note) => (
          <li key={note.id} className="rounded-control border border-line bg-surface-raised p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="font-medium">
                {note.authorName}
                {note.authorId === currentUserId ? (
                  <span className="ml-2 text-xs font-normal text-ink-faint">(you)</span>
                ) : null}
              </p>
              <p className="text-xs text-ink-faint">
                {formatDate(note.createdAt)}
                {note.updatedAt ? ` · Edited ${formatDate(note.updatedAt)}` : ''}
              </p>
            </div>
            <p className="mt-2 whitespace-pre-line text-ink-muted">{note.content}</p>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className="mt-6 rounded-card border border-line bg-surface p-6 backdrop-blur-md">
      <h2 className="text-lg font-semibold tracking-tight">
        Notes{query.isSuccess ? ` (${query.data.length})` : ''}
      </h2>

      <div className="mt-4">{body}</div>

      <div className="mt-6">
        <AddNoteForm paperId={paperId} />
      </div>
    </section>
  )
}