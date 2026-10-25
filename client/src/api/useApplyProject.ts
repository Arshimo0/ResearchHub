import { useQueryClient } from '@tanstack/react-query'
import { projectKeys } from './projects'
import type { Project } from './types'

/** Stores a project the API just returned, and marks the project list stale. */
export function useApplyProject() {
  const queryClient = useQueryClient()

  return (project: Project) => {
    queryClient.setQueryData(projectKeys.detail(project.id), project)
    void queryClient.invalidateQueries({ queryKey: projectKeys.list() })
  }
}