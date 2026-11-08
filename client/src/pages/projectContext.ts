import { useOutletContext } from 'react-router'
import type { Project } from '../api/types'

export interface ProjectContext {
  project: Project
  currentUserId?: string
  isOwner: boolean
}

/** Read the project that ProjectDetailPage loaded. Use this inside its tab pages. */
export function useProject() {
  return useOutletContext<ProjectContext>()
}