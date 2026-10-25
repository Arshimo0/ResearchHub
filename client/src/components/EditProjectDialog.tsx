import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { projectsApi } from '../api/projects'
import type { Project, UpdateProjectRequest } from '../api/types'
import { useApplyProject } from '../api/useApplyProject'
import { noErrors, toFormErrors, type FormErrors } from '../forms/formErrors'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'
import { TextAreaField } from './TextAreaField'
import { TextField } from './TextField'

const FIELDS = ['name', 'description'] as const

function EditProjectForm({ project, onDone }: { project: Project; onDone: () => void }) {
  const applyProject = useApplyProject()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [errors, setErrors] = useState<FormErrors>(noErrors)

  const update = useMutation({
    mutationFn: (body: UpdateProjectRequest) => projectsApi.update(project.id, body),
    onSuccess: applyProject,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors(noErrors)

    try {
      await update.mutateAsync({ name, description })
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
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        error={errors.fields.description}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
        <Button type="submit" loading={update.isPending}>
          Save changes
        </Button>
      </div>
    </form>
  )
}

interface EditProjectDialogProps {
  project: Project
  open: boolean
  onClose: () => void
}

export function EditProjectDialog({ project, open, onClose }: EditProjectDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Edit project">
      <EditProjectForm project={project} onDone={onClose} />
    </Modal>
  )
}