import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { paperKeys, papersApi } from '../api/papers'
import type { CreatePaperRequest } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { PAPER_FIELDS, emptyPaperValues, toPaperDetails } from '../forms/paperForm'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { PaperFields } from './PaperFields'
import { TagInput } from './TagInput'

function NewPaperForm({ projectId, onDone }: { projectId: string; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(emptyPaperValues)
  const [tags, setTags] = useState<string[]>([])
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const create = useMutation({
    mutationFn: (body: CreatePaperRequest) => papersApi.create(projectId, body),
    // Mark every paper query stale, and wait for the visible list to refresh before the dialog closes.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: paperKeys.all }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await create.mutateAsync({ ...toPaperDetails(values), tags })
      onDone()
    } catch (error) {
      setErrors(toFormErrors(error, PAPER_FIELDS))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={errors.form} />

      <PaperFields
        values={values}
        onChange={(patch) => setValues((current) => ({ ...current, ...patch }))}
        errors={errors.fields}
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