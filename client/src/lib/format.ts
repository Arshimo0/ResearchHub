const HAS_ZONE = /(Z|[+-]\d{2}:?\d{2})$/i

/**
 * Formats an API timestamp for display. The API omits the zone on values read
 * back from the database, and JavaScript would read those as local time, so a
 * timestamp without a zone is treated as UTC.
 */
export function formatDate(iso: string): string {
  const needsZone = iso.includes('T') && !HAS_ZONE.test(iso)
  const date = new Date(needsZone ? `${iso}Z` : iso)

  return Number.isNaN(date.getTime())
    ? ''
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}