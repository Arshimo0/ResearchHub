import { useMutation } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { projectsApi } from '../api/projects'
import { useApplyProject } from '../api/useApplyProject'
import { usersApi } from '../api/users'
import { toFormErrors } from '../forms/formErrors'
import { Button } from './Button'
import { TextField } from './TextField'

export function AddMemberForm({ projectId }: { projectId: string }) {
  const applyProject = useApplyProject()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()

  const add = useMutation({
    // The API adds members by id, so find the person first.
    mutationFn: async (address: string) => {
      const person = await usersApi.lookup(address)
      return projectsApi.addMember(projectId, { userId: person.id, role: 'Member' })
    },
    onSuccess: applyProject,
  })

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(undefined)

    try {
      await add.mutateAsync(email)
      setEmail('')
    } catch (e) {
      const { fields, form } = toFormErrors(e, ['email'])
      setError(fields.email ?? form ?? undefined)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 flex items-start gap-3">
      <div className="flex-1">
        <TextField
          label="Add a member by email"
          type="email"
          name="email"
          autoComplete="off"
          hint="They need an account first."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={error}
        />
      </div>
      <Button type="submit" loading={add.isPending} className="mt-6">
        Add member
      </Button>
    </form>
  )
}