import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { paperKeys, papersApi } from '../api/papers'
import type { CreatePaperRequest } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { TagInput } from './TagInput'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

const FIELDS = ['title', 'authors', 'abstract', 'publicationDate', 'doiOrUrl', 'pdfReference', 'tags'] as const

function NewPaperForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState('')
  const [authors, setAuthors] = useState('')
  const [abstractText, setAbstractText] = useState('')
  const [publicationDate, setPublicationDate] = useState('')
  const [doiOrUrl, setDoiOrUrl] = useState('')
  const [pdfReference, setPdfReference] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const create = useMutation({
    mutationFn: (body: CreatePaperRequest) => papersApi.create(projectId, body),
    // Mark this project's list stale so it refetches, and wait for it before the dialog closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paperKeys.list(projectId) }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await create.mutateAsync({
        title: title.trim(),
        authors: authors.trim(),
        abstract: abstractText.trim(),
        publicationDate: publicationDate || null,
        doiOrUrl: doiOrUrl.trim() || null,
        pdfReference: pdfReference.trim() || null,
        tags,
      })
      onDone()
    } catch (error) {
      setErrors(toFormErrors(error, FIELDS))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={errors.form} />

      <TextField
        label="Title"
        name="title"
        autoComplete="off"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        error={errors.fields.title}
      />
      <TextField
        label="Authors"
        name="authors"
        autoComplete="off"
        hint="Separate names with semicolons."
        value={authors}
        onChange={(e) => setAuthors(e.target.value)}
        error={errors.fields.authors}
      />
      <TextAreaField
        label="Abstract"
        name="abstract"
        rows={5}
        value={abstractText}
        onChange={(e) => setAbstractText(e.target.value)}
        error={errors.fields.abstract}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="Publication date"
          type="date"
          name="publicationDate"
          value={publicationDate}
          onChange={(e) => setPublicationDate(e.target.value)}
          error={errors.fields.publicationDate}
        />
        <TextField
          label="DOI or URL"
          name="doiOrUrl"
          autoComplete="off"
          hint="A DOI like 10.1000/xyz, or a web address."
          value={doiOrUrl}
          onChange={(e) => setDoiOrUrl(e.target.value)}
          error={errors.fields.doiOrUrl}
        />
      </div>

      <TextField
        label="PDF link"
        name="pdfReference"
        autoComplete="off"
        hint="Optional. Where the PDF can be found."
        value={pdfReference}
        onChange={(e) => setPdfReference(e.target.value)}
        error={errors.fields.pdfReference}
      />

      <TagInput
        label="Tags"
        value={tags}
        onChange={setTags}
        hint="Press Enter or type a comma to add a tag."
        error={errors.fields.tags}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          Save paper
        </Button>
      </div>
    </form>
  )
}

interface NewPaperDialogProps {
  projectId: string
  open: boolean
  onClose: () => void
}

export function NewPaperDialog({ projectId, open, onClose }: NewPaperDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Add paper">
      <NewPaperForm projectId={projectId} onDone={onClose} />
    </Modal>
  )
}