import { request } from './client'
import type { UserLookup } from './types'

export const usersApi = {
  lookup: (email: string) =>
    request<UserLookup>(`/api/users/lookup?email=${encodeURIComponent(email.trim())}`),
}