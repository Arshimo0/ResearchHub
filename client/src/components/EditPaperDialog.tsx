import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { TagUpdateError, paperKeys, savePaperChanges } from '../api/papers'
import type { Paper } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import {
  PAPER_FIELDS,
  paperToFormValues,
  toPaperDetails,
  type PaperFormValues,
} from '../forms/paperForm'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { PaperFields } from './PaperFields'
import { TagInput } from './TagInput'

interface SaveInput {
  values: PaperFormValues
  tags: string[]
}

function EditPaperForm({ paper, onDone }: { paper: Paper; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState(() => paperToFormValues(paper))
  const [tags, setTags] = useState(() => paper.tags.map((tag) => tag.name))
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const save = useMutation({
    mutationFn: (input: SaveInput) => savePaperChanges(paper, toPaperDetails(input.values), input.tags),
    // Refresh whether the save worked or only partly worked, so the cards behind never show something false.
    onSettled: () => queryClient.invalidateQueries({ queryKey: paperKeys.all }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await save.mutateAsync({ values, tags })
      onDone()
    } catch (error) {
      if (error instanceof TagUpdateError) {
        setErrors({
          fields: {},
          form: `Your changes to the details were saved, but the tags could not be updated: ${error.message}`,
        })
      } else {
        setErrors(toFormErrors(error, PAPER_FIELDS))
      }
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
        <Button type="submit" loading={save.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

interface EditPaperDialogProps {
  paper: Paper | null
  onClose: () => void
}

export function EditPaperDialog({ paper, onClose }: EditPaperDialogProps) {
  return (
    <Modal open={paper !== null} onClose={onClose} title="Edit paper">
      {paper ? <EditPaperForm paper={paper} onDone={onClose} /> : null}
    </Modal>
  )
}