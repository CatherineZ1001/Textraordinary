// Usage:
//   node scripts/set-admin.mjs someone@example.com          (make admin)
//   node scripts/set-admin.mjs someone@example.com --remove (remove admin)
// Needs GOOGLE_APPLICATION_CREDENTIALS pointing at a service account key (the same one the seed script uses).
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

const [email, flag] = process.argv.slice(2)
if (!email) {
  console.error('Usage: node scripts/set-admin.mjs <email> [--remove]')
  process.exit(1)
}
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to the path of your service account key first.')
  process.exit(1)
}

initializeApp({ credential: applicationDefault() })
const auth = getAuth()

const user = await auth.getUserByEmail(email)
const claims = { ...user.customClaims }
if (flag === '--remove') delete claims.admin
else claims.admin = true

await auth.setCustomUserClaims(user.uid, claims)
console.log(
  `${email} is now ${claims.admin ? 'an admin' : 'not an admin'}. They must sign out and back in.`,
)
