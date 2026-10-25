import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { errorMessage } from '../api/client'
import { projectKeys, projectsApi } from '../api/projects'
import type { Project } from '../api/types'
import { Button } from './Button'
import { FormError } from './FormError'
import { Modal } from './Modal'

function DeleteProjectContent({ project, onCancel }: { project: Project; onCancel: () => void }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const remove = useMutation({ mutationFn: () => projectsApi.remove(project.id) })

  async function handleDelete() {
    setError(null)

    try {
      await remove.mutateAsync()
    } catch (e) {
      setError(errorMessage(e))
      return
    }

    // Everything cached about projects is now out of date. Mark it stale without
    // refetching what is on screen (this page would only get a 404), then leave.
    await queryClient.invalidateQueries({ queryKey: projectKeys.all, refetchType: 'none' })
    navigate('/', { replace: true })
  }

  return (
    <div className="space-y-4">
      <FormError message={error} />

      <p className="text-ink-muted">
        This permanently deletes <strong className="text-ink">{project.name}</strong> together with its
        papers, notes, tags and tasks. This can't be undone.
      </p>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" loading={remove.isPending} onClick={() => void handleDelete()}>
          Delete permanently
        </Button>
      </div>
    </div>
  )
}

interface DeleteProjectDialogProps {
  project: Project
  open: boolean
  onClose: () => void
}

export function DeleteProjectDialog({ project, open, onClose }: DeleteProjectDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title="Delete this project?">
      <DeleteProjectContent project={project} onCancel={onClose} />
    </Modal>
  )
}