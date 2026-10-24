import { ApiError } from '../api/client'

export interface FormErrors {
  fields: Record<string, string>
  form: string | null
}

export const noErrors: FormErrors = { fields: {}, form: null }

/**
 * Turns an API error into messages for specific inputs plus an optional
 * banner. A field error with no matching input goes to the banner, so a
 * message is never silently dropped.
 */
export function toFormErrors(error: unknown, knownFields: readonly string[]): FormErrors {
  if (!(error instanceof ApiError)) {
    return { fields: {}, form: 'Something went wrong. Please try again.' }
  }

  const fields: Record<string, string> = {}
  const unmatched: string[] = []

  for (const [name, messages] of Object.entries(error.fieldErrors)) {
    if (messages.length === 0) continue
    if (knownFields.includes(name)) fields[name] = messages[0]
    else unmatched.push(messages[0])
  }

  const form = unmatched[0] ?? (Object.keys(fields).length === 0 ? error.message : null)

  return { fields, form }
}