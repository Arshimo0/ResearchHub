const DOI = /^10\.\d{4,9}\/\S+$/

/**
 * Turns user-entered text into a link that is safe to put in an href, or null.
 * Only http(s) addresses and bare DOIs qualify. Anything else, such as
 * "javascript:..." or "data:...", must be shown as plain text.
 */
export function externalLink(value: string): string | null {
  const text = value.trim()

  const doi = text.replace(/^doi:\s*/i, '')
  if (DOI.test(doi)) return `https://doi.org/${encodeURI(doi)}`

  try {
    const url = new URL(text)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null
  } catch {
    return null
  }
}