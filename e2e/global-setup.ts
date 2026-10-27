import { execFileSync } from 'node:child_process'
import { PROJECT_ID, TEST_USER } from './helpers'

// Runs once before the tests, inside `firebase emulators:exec` (which sets the *_EMULATOR_HOST
// variables): wipes the emulators, creates the test account and seeds the test scenario.
export default async function globalSetup() {
  const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST
  const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST
  if (!authHost || !firestoreHost) {
    throw new Error(
      'The Firebase emulators are not running. Use `npm run test:e2e` instead of `playwright test`.',
    )
  }

  await clear(`http://${authHost}/emulator/v1/projects/${PROJECT_ID}/accounts`)
  await clear(
    `http://${firestoreHost}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`,
  )

  // The emulator accepts any API key
  const signUp = await fetch(
    `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
    },
  )
  if (!signUp.ok) throw new Error(`Creating the test user failed: ${await signUp.text()}`)

  execFileSync(process.execPath, ['scripts/seed-scenarios.mjs', 'e2e/fixtures/scenarios.json'], {
    stdio: 'inherit',
    env: { ...process.env, GCLOUD_PROJECT: PROJECT_ID },
  })
}

async function clear(url: string) {
  const res = await fetch(url, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Clearing ${url} failed: ${res.status} ${await res.text()}`)
}
