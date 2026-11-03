// Optional: the usual way to make an administrator is `admin: true` on their Firestore profile,
// set in the Firebase console (see the README). This script sets the older custom claim instead.
// Usage:
//   node scripts/set-admin.mjs someone@example.com          (make admin)
//   node scripts/set-admin.mjs someone@example.com --remove (remove admin)
// Needs GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key (the same one the seed script uses).
// Works for any sign-in method (email/password or Google): the role belongs to the Firebase account.
import { readFileSync } from 'node:fs'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const [email, flag] = process.argv.slice(2)
if (!email) {
  console.error('Usage: node scripts/set-admin.mjs <email> [--remove]')
  process.exit(1)
}
const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
if (!keyPath) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account key first.')
  console.error('  PowerShell: $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\\path\\to\\key.json"')
  process.exit(1)
}

// The key decides which Firebase project is changed; it must be the one the app uses (.env.local)
let keyProject
try {
  keyProject = JSON.parse(readFileSync(keyPath, 'utf8')).project_id
} catch (err) {
  console.error(`Couldn't read the service account key at ${keyPath}: ${err.message}`)
  process.exit(1)
}
let appProject
try {
  appProject = readFileSync('.env.local', 'utf8').match(/^VITE_FIREBASE_PROJECT_ID=(.*)$/m)?.[1]?.trim()
} catch {
  // no .env.local here; skip the check
}
if (appProject && keyProject !== appProject) {
  console.error(
    `The service account key is for project "${keyProject}", but the app (.env.local) uses "${appProject}".`,
  )
  console.error('Download a key from the app\'s project: Project settings → Service accounts.')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const auth = getAuth()

let user
try {
  user = await auth.getUserByEmail(email)
} catch (err) {
  if (err.code === 'auth/user-not-found') {
    console.error(`No account with the email ${email} in project "${keyProject}".`)
    console.error('Sign in to the app once with that account (Google sign-in creates it), then run this again.')
    process.exit(1)
  }
  throw err
}

const claims = { ...user.customClaims }
if (flag === '--remove') delete claims.admin
else claims.admin = true
await auth.setCustomUserClaims(user.uid, claims)

// Read it back to confirm
const updated = await auth.getUser(user.uid)
const providers = user.providerData.map((p) => p.providerId).join(', ') || 'unknown'
console.log(`Project: ${keyProject}`)
console.log(`Account: ${email} (uid ${user.uid}, sign-in: ${providers})`)
console.log(`Admin:   ${updated.customClaims?.admin === true ? 'yes' : 'no'}`)
console.log('Sign out of the app and sign back in for the change to take effect.')
