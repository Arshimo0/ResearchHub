import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { projectKeys, projectsApi } from '../api/projects'
import type { CreateProjectRequest } from '../api/types'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

const FIELDS = ['name', 'description'] as const

function NewProjectForm({ onDone }: { onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const create = useMutation({
    mutationFn: (body: CreateProjectRequest) => projectsApi.create(body),
    // Mark the list stale so it refetches. Returning the promise keeps the
    // mutation "pending" until the refreshed list has arrived.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projectKeys.list() }),
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await create.mutateAsync({ name, description })
      onDone()
    } catch (error) {
      setErrors(toFormErrors(error, FIELDS))
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <FormError message={errors.form} />

      <TextField
        label="Name"
        name="name"
        autoComplete="off"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.fields.name}
      />
      <TextAreaField
        label="Description"
        name="description"
        hint="Optional. What is this project about?"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.fields.description}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={create.isPending}>
          Create project
        </Button>
      </div>
    </form>
  )
}

export function NewProjectDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="New project">
      <NewProjectForm onDone={onClose} />
    </Modal>
  )
}