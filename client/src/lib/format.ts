const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

/**
 * Parses an API timestamp. The API omits the zone on values read back from
 * the database, and JavaScript would read those as local time, so a timestamp
 * without a zone is treated as UTC.
 */
export function parseApiDate(iso: string): Date {
  const needsZone = iso.includes('T') && !HAS_ZONE.test(iso)
  return new Date(needsZone ? `${iso}Z` : iso)
}

/** Formats a moment in time (created, joined) in the viewer's time zone. */
export function formatDate(iso: string): string {
  const date = parseApiDate(iso)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

/** Formats a calendar date (such as a publication date), which must not shift with the viewer's time zone. */
export function formatPublicationDate(iso: string): string {
  const date = parseApiDate(iso)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })
}