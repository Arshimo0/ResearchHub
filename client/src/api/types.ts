export type PlatformRole = 'User' | 'Admin'
export type ProjectRole = 'Owner' | 'Member'
export type ProjectStatus = 'Active' | 'Completed' | 'Archived'
export interface User {
  id: string
  email: string
  displayName: string
  role: PlatformRole
}

export interface AuthResult {
  accessToken: string
  refreshToken: string
  accessTokenExpiresAt: string
  user: User
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  displayName: string
  password: string
}

export interface ProblemDetails {
  title: string
  status: number
  traceId?: string
  detail?: string
  errors?: Record<string, string[]>
}

export interface ProjectSummary {
  id: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: string
  memberCount: number
  myRole: ProjectRole
}

export interface ProjectMember {
  userId: string
  displayName: string
  role: ProjectRole
  joinedAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  status: ProjectStatus
  createdAt: string
  members: ProjectMember[]
}

export interface CreateProjectRequest {
  name: string
  description: string
}

export interface UpdateProjectRequest {
  name: string
  description: string
}

export interface AddMemberRequest {
  userId: string
  role: ProjectRole
}

export interface UserLookup {
  id: string
  email: string
  displayName: string
}

export interface Tag {
  id: string
  name: string
}

export interface Paper {
  id: string
  projectId: string
  title: string
  authors: string
  abstract: string
  publicationDate: string | null
  doiOrUrl: string | null
  pdfReference: string | null
  addedByUserId: string
  addedByName: string
  createdAt: string
  tags: Tag[]
}

export interface CreatePaperRequest {
  title: string
  authors: string
  abstract: string
  publicationDate: string | null
  doiOrUrl: string | null
  pdfReference: string | null
  tags: string[]
}

export type UpdatePaperRequest = Omit<CreatePaperRequest, 'tags'>

export interface AddTagRequest {
  name: string
}

export interface PaperFilter {
  tag?: string
  author?: string
  from?: string
  to?: string
}

export interface Note {
  id: string
  paperId: string
  authorId: string
  authorName: string
  content: string
  createdAt: string
  updatedAt: string | null
}

export interface CreateNoteRequest {
  content: string
}

export interface UpdateNoteRequest {
  content: string
}

export type ResearchTaskStatus = 'ToDo' | 'InProgress' | 'Done'
export type TaskPriority = 'Low' | 'Medium' | 'High'

export interface ResearchTask {
  id: string
  projectId: string
  paperId: string | null
  title: string
  description: string
  status: ResearchTaskStatus
  priority: TaskPriority
  deadline: string | null
  assignedToUserId: string | null
  assignedToName: string | null
  createdByUserId: string
  createdByName: string
  createdAt: string
  completedAt: string | null
}