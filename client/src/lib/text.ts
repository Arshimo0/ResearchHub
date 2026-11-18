/** A short, single-line preview of some text, for labels. */
export function snippet(text: string, max = 40): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length <= max ? clean : `${clean.slice(0, max).trimEnd()}…`
}