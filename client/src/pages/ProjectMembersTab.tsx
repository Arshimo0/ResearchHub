import { MembersSection } from '../components/MembersSection'
import { useProject } from './projectContext'

export function ProjectMembersTab() {
  const { project, currentUserId, isOwner } = useProject()

  return <MembersSection project={project} currentUserId={currentUserId} isOwner={isOwner} />
}