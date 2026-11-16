import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { errorMessage } from '../api/client'
import { taskKeys, tasksApi } from '../api/tasks'
import type { ResearchTask, ResearchTaskStatus } from '../api/types'
import { statusMoves } from '../lib/tasks'
import { Button } from './Button'

export function TaskStatusActions({ task }: { task: ResearchTask }) {
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  const change = useMutation({
    mutationFn: (status: ResearchTaskStatus) => tasksApi.changeStatus(task.id, status),
    // Refresh whether it worked or not, so the card is always in the right group with the right buttons.
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  })

  async function handleMove(to: ResearchTaskStatus) {
    setError(null)

    try {
      await change.mutateAsync(to)
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {statusMoves[task.status].map((move) => (
          <Button
            key={move.to}
            variant="ghost"
            size="sm"
            aria-label={`${move.label}: ${task.title}`}
            disabled={change.isPending}
            loading={change.isPending && change.variables === move.to}
            onClick={() => void handleMove(move.to)}
          >
            {move.label}
          </Button>
        ))}
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}