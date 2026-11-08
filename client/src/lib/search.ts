export const MIN_QUERY_LENGTH = 2
export const MAX_QUERY_LENGTH = 100
/** The API uses only the first five words of a query. */
export const MAX_QUERY_WORDS = 5
/** The API returns at most this many results, newest first. */
export const SEARCH_RESULT_LIMIT = 50

/** Trims the text and collapses runs of whitespace, so "  a   b " becomes "a b". */
export function normalizeQuery(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Why a normalised query cannot be sent, or null when it is fine. The API enforces the same rules. */
export function queryProblem(query: string): string | null {
  if (query.length < MIN_QUERY_LENGTH) {
    return `Search text must be at least ${MIN_QUERY_LENGTH} characters.`
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return `Search text can be at most ${MAX_QUERY_LENGTH} characters.`
  }
  return null
}

/** Counts the words of a normalised query. */
export function wordCount(query: string): number {
  return query === '' ? 0 : query.split(' ').length
}