// Client-side only. Firebase's auth/too-many-requests limit still applies server-side.

export const MAX_FAILURES = 5
export const WINDOW_MS = 15 * 60_000
export const LOCK_MS = 15 * 60_000

const STORAGE_KEY = 'textraordinary.loginFailures'

interface Entry {
  failures: number[]
  lockedUntil?: number
}

type Store = Record<string, Entry>

const normalize = (email: string) => email.trim().toLowerCase()

let memory: Store = {}
function read(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Store) : {}
  } catch {
    return memory
  }
}
function write(store: Store) {
  memory = store
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    // ignore
  }
}

export function lockedUntil(email: string, now = Date.now()): number | null {
  const entry = read()[normalize(email)]
  return entry?.lockedUntil && entry.lockedUntil > now ? entry.lockedUntil : null
}

export function attemptsLeft(email: string, now = Date.now()): number {
  const entry = read()[normalize(email)]
  const recent = entry?.failures.filter((t) => now - t < WINDOW_MS).length ?? 0
  return Math.max(0, MAX_FAILURES - recent)
}

export function recordFailure(email: string, now = Date.now()): number | null {
  const store = read()
  const key = normalize(email)
  const failures = [...(store[key]?.failures ?? []).filter((t) => now - t < WINDOW_MS), now]
  if (failures.length >= MAX_FAILURES) {
    store[key] = { failures: [], lockedUntil: now + LOCK_MS }
  } else {
    store[key] = { failures }
  }
  for (const [k, e] of Object.entries(store)) {
    if (!e.failures.some((t) => now - t < WINDOW_MS) && !(e.lockedUntil && e.lockedUntil > now)) {
      delete store[k]
    }
  }
  write(store)
  return store[key]?.lockedUntil ?? null
}

export function clearFailures(email: string) {
  const store = read()
  delete store[normalize(email)]
  write(store)
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${String(s).padStart(2, '0')}`
}
