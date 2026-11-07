import { expect, type Page } from '@playwright/test'

export const PROJECT_ID = 'demo-textraordinary'

/** TC-UA-01 test data; global-setup creates this account in the Auth emulator. */
export const TEST_USER = {
  email: 'testuser01@example.com',
  password: 'Pass123!',
  displayName: 'Test User',
}

/** The scenario in e2e/fixtures/scenarios.json */
export const SCENARIO = {
  id: 'sc-900',
  title: 'Asking your manager for more time',
  contact: 'Jordan',
  options: {
    B: "Sam is out sick, so we're behind. Could we move the deadline to Tuesday? I'll send what's done by Friday.",
    D: 'Can we talk later? Kind of busy right now.',
  },
}

export async function signIn(page: Page, user: { email: string; password: string } = TEST_USER) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

function emulatorHost(name: 'FIREBASE_AUTH_EMULATOR_HOST' | 'FIRESTORE_EMULATOR_HOST') {
  const host = process.env[name]
  if (!host) throw new Error(`${name} is not set. Run the tests with \`npm run test:e2e\`.`)
  return host
}

/**
 * Creates a new account in the Auth emulator, for tests that need a member with no saved data
 * (e.g. no daily challenge results). The email is unique, so retries start fresh too.
 */
export async function createUser(prefix: string) {
  const user = {
    email: `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`,
    password: 'Pass123!',
    displayName: 'Daily Tester',
  }
  const res = await fetch(
    `http://${emulatorHost('FIREBASE_AUTH_EMULATOR_HOST')}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, returnSecureToken: true }),
    },
  )
  if (!res.ok) throw new Error(`Creating a test user failed: ${await res.text()}`)
  const { localId, idToken } = (await res.json()) as { localId: string; idToken: string }
  return { ...user, uid: localId, idToken }
}

const documentsUrl = () =>
  `http://${emulatorHost('FIRESTORE_EMULATOR_HOST')}/v1/projects/${PROJECT_ID}/databases/(default)/documents`

/**
 * Writes a Firestore document through the emulator's REST API. With no token it writes as the
 * owner, which skips the security rules (like the Admin SDK); with a user's ID token the rules apply.
 * Returns the HTTP status.
 */
export async function writeDoc(
  path: string,
  fields: Record<string, unknown>,
  idToken = 'owner',
): Promise<number> {
  const res = await fetch(`${documentsUrl()}/${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ fields }),
  })
  return res.status
}

/**
 * Gives an account the admin role the way it's done in the Firebase console: `admin: true` on its
 * users/{uid} profile. The app reads the role on page load, so reload after this.
 */
export async function makeAdmin(uid: string) {
  const status = await writeDoc(`users/${uid}?updateMask.fieldPaths=admin`, {
    admin: { booleanValue: true },
  })
  if (status !== 200) throw new Error(`Making the test user an admin failed: ${status}`)
}

/** Deletes a Firestore document as the owner (skipping the security rules). */
export async function deleteDoc(path: string) {
  const res = await fetch(`${documentsUrl()}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: 'Bearer owner' },
  })
  if (!res.ok) throw new Error(`Deleting ${path} failed: ${res.status} ${await res.text()}`)
}

/** Reads a Firestore document as the owner (skipping the security rules); null if it doesn't exist. */
export async function readDocFields(path: string): Promise<Record<string, unknown> | null> {
  const res = await fetch(`${documentsUrl()}/${path}`, {
    headers: { Authorization: 'Bearer owner' },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`Reading ${path} failed: ${res.status} ${await res.text()}`)
  return ((await res.json()) as { fields?: Record<string, unknown> }).fields ?? {}
}

/** A date as "YYYY-MM-DD" in local time, like the app's localDateKey(); `offset` is in days. */
export function dateKey(offset = 0) {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return [d.getFullYear(), d.getMonth() + 1, d.getDate()]
    .map((n) => String(n).padStart(2, '0'))
    .join('-')
}

/** Plays the scenario's messages on the phone and sends suggested reply `option` */
export async function playOneRound(page: Page, option: string) {
  await page.getByRole('radio', { name: 'Pick a reply' }).click()
  await page.getByRole('button', { name: 'Wake the phone' }).click()
  await page.getByRole('button', { name: `Open message from ${SCENARIO.contact}` }).click()
  await page.getByRole('button', { name: option }).click()
  await page.getByRole('button', { name: 'Send reply' }).click()
}

/** Opens the test scenario in the given mode and plays its messages, ready for a reply. */
export async function openScenario(page: Page, mode: 'Pick a reply' | 'Write your own') {
  await page.goto(`/practice/${SCENARIO.id}`)
  await page.getByRole('radio', { name: mode }).click()
  await page.getByRole('button', { name: 'Wake the phone' }).click()
  await page.getByRole('button', { name: `Open message from ${SCENARIO.contact}` }).click()
}

/** What the mocked coach returns: the JSON the prompt in src/ai/evaluateReply.ts asks the model for. */
export interface CoachGrade {
  score: number
  verdict: string
  toneMatch: 'on-target' | 'close' | 'off'
  strengths: string[]
  improvements: string[]
  suggestedRewrite: string
  likelyReaction: string
  bestOptionLetter?: string
  bestOptionWhy?: string
}

/**
 * Replaces the NaviGator AI with a fixed answer, so tests use no API credit and always get the
 * same grade. Set `response` to 'down' to make the service fail (HTTP 503).
 * `requests` collects the request bodies the app sent.
 */
export async function mockCoach(page: Page, response: CoachGrade | 'down') {
  const coach = { response, requests: [] as string[] }
  await page.route('**/api/navigator/chat/completions', (route) => {
    coach.requests.push(route.request().postData() ?? '')
    if (coach.response === 'down') {
      return route.fulfill({ status: 503, json: { error: { message: 'Service unavailable' } } })
    }
    return route.fulfill({
      json: {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(coach.response) },
            finish_reason: 'stop',
          },
        ],
      },
    })
  })
  return coach
}

/** Turns a Firestore REST value ({ stringValue: 'x' }, { mapValue: ... }) into plain JSON */
function plain(value: Record<string, unknown>): unknown {
  if ('nullValue' in value) return null
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return Number(value.doubleValue)
  if ('arrayValue' in value) {
    const values = (value.arrayValue as { values?: Record<string, unknown>[] }).values ?? []
    return values.map(plain)
  }
  if ('mapValue' in value) {
    const fields = (value.mapValue as { fields?: Record<string, Record<string, unknown>> }).fields
    return plainFields(fields ?? {})
  }
  return Object.values(value)[0] // stringValue, booleanValue, timestampValue
}

function plainFields(fields: Record<string, Record<string, unknown>>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, plain(v)]))
}

/**
 * Reads every document in a Firestore collection through the emulator's REST API, as plain
 * objects with their `id`. With no token it reads as the owner (skipping the rules); with a
 * user's ID token the rules apply and `status` is 403 if they're not allowed.
 */
export async function readCollection<T extends object = Record<string, unknown>>(
  path: string,
  idToken = 'owner',
) {
  const res = await fetch(`${documentsUrl()}/${path}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  })
  const body = (await res.json()) as {
    documents?: { name: string; fields?: Record<string, Record<string, unknown>> }[]
  }
  const docs = (body.documents ?? []).map(
    (d) =>
      ({
        ...plainFields(d.fields ?? {}),
        id: d.name.split('/').pop()!,
      }) as T & { id: string },
  )
  return { status: res.status, docs }
}

/** Tries to delete a document as a member; returns the HTTP status (403 if the rules refuse). */
export async function deleteDocAs(path: string, idToken: string): Promise<number> {
  const res = await fetch(`${documentsUrl()}/${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${idToken}` },
  })
  return res.status
}

/** Turns plain JSON into Firestore REST fields, for writeDoc. Dates become timestamps. */
export function toFields(data: Record<string, unknown>): Record<string, unknown> {
  const value = (v: unknown): Record<string, unknown> => {
    if (v === null || v === undefined) return { nullValue: null }
    if (v instanceof Date) return { timestampValue: v.toISOString() }
    if (typeof v === 'string') return { stringValue: v }
    if (typeof v === 'boolean') return { booleanValue: v }
    if (typeof v === 'number') {
      return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v }
    }
    if (Array.isArray(v)) return { arrayValue: { values: v.map(value) } }
    return { mapValue: { fields: toFields(v as Record<string, unknown>) } }
  }
  return Object.fromEntries(Object.entries(data).map(([k, v]) => [k, value(v)]))
}

/** Noon, local time, `offset` days from today: safely inside that date in any time zone */
export function noonDaysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(12, 0, 0, 0)
  return d
}
