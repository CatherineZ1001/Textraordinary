// Calendar dates as "YYYY-MM-DD" keys. Daily challenges and their results are stored under these
// keys, and they always mean the date in the member's own time zone.

/** A date (default: now) as "YYYY-MM-DD" in the user's time zone. */
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parts(key: string): [number, number, number] {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number)
  return [y, m, d]
}

/** True for a real calendar date written as "YYYY-MM-DD". */
export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [y, m, d] = parts(value)
  return new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10) === value
}

/** The date `days` after `key` (negative goes back). */
export function addDays(key: string, days: number): string {
  const [y, m, d] = parts(key)
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10)
}

/** Days since 1970-01-01, so consecutive dates give consecutive numbers. */
export function dayNumber(key: string): number {
  const [y, m, d] = parts(key)
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000)
}

/** e.g. "Mon, Nov 2" */
export function formatDateKey(
  key: string,
  options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' },
): string {
  const [y, m, d] = parts(key)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, options)
}
