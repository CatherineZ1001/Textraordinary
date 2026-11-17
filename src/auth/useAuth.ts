import { computed, readonly, ref, shallowRef } from 'vue'
import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onIdTokenChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type ActionCodeSettings,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '@/firebase'
import { ensureUserProfile, hasAdminProfile } from '@/data/users'
import { BAD_CREDENTIAL_CODES, EmailNotVerifiedError, LoginLockedError } from './errors'
import { clearFailures, lockedUntil, recordFailure } from './loginThrottle'

const user = shallowRef<User | null>(null)
const isAdmin = ref(false)
const ready = ref(false)

let resolveReady: () => void
/** Resolves once Firebase has restored (or failed to restore) the saved session, including the admin role. */
export const authReady = new Promise<void>((resolve) => (resolveReady = resolve))

let signingOut = false
let sessionLostHandler: (() => void) | null = null

/** Registers a callback for when the user is signed out without calling logout() (revoked, disabled, expired). */
export function onSessionLost(handler: () => void) {
  sessionLostHandler = handler
}

export function isVerified(u: User): boolean {
  return u.emailVerified || !u.providerData.some((p) => p.providerId === 'password')
}

let handlingUnverified = false

// The admin role is `admin: true` on the user's Firestore profile, set in the Firebase console
// (the security rules stop members from setting it), or the older custom claim set by
// scripts/set-admin.mjs. It is read again on every page load, so a reload picks up a change.
async function readAdminRole(next: User | null): Promise<boolean> {
  if (!next) return false
  try {
    const result = await getIdTokenResult(next)
    if (result.claims.admin === true) return true
    return await hasAdminProfile(next.uid)
  } catch {
    return false
  }
}

onIdTokenChanged(auth, async (firebaseUser) => {
  let next = firebaseUser
  if (next && !isVerified(next)) {
    if (!handlingUnverified) void signOut(auth).catch(() => {})
    next = null
  }

  // Work out the role first so nothing ever sees a signed-in user with a stale role.
  const admin = await readAdminRole(next)

  const wasSignedIn = user.value !== null
  isAdmin.value = admin
  user.value = next

  if (!ready.value) {
    ready.value = true
    resolveReady()
    // A restored session may belong to an account that was since disabled or deleted;
    // reload() makes Firebase check, and it signs the user out if the account is no longer valid.
    if (next) void verifyUser()
  }

  if (wasSignedIn && !next && !signingOut) sessionLostHandler?.()
  signingOut = false
})

let lastVerified = 0
async function verifyUser() {
  if (!auth.currentUser) return
  lastVerified = Date.now()
  try {
    await reload(auth.currentUser)
  } catch {
    // Invalid accounts are signed out by Firebase and reported through onIdTokenChanged.
  }
}

// A failed profile write must never block login or registration; it retries at the next sign-in.
async function saveProfile(displayName?: string) {
  if (!auth.currentUser) return
  try {
    await ensureUserProfile(auth.currentUser, displayName)
  } catch (err) {
    console.error('Could not save the user profile:', err)
  }
}

// Re-check when the user returns to the tab, at most once a minute.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastVerified > 60_000) {
    void verifyUser()
  }
})

function verificationSettings(): ActionCodeSettings {
  return { url: `${window.location.origin}/login?verified=1` }
}

async function checkedSignIn(email: string, password: string): Promise<User> {
  const until = lockedUntil(email)
  if (until) throw new LoginLockedError(until)
  try {
    const credential = await signInWithEmailAndPassword(auth, email, password)
    clearFailures(email)
    return credential.user
  } catch (err) {
    if (err instanceof FirebaseError && BAD_CREDENTIAL_CODES.includes(err.code)) {
      const lockStarted = recordFailure(email)
      if (lockStarted) throw new LoginLockedError(lockStarted)
    }
    throw err
  }
}

async function loginWithEmail(email: string, password: string) {
  handlingUnverified = true
  try {
    const signedIn = await checkedSignIn(email, password)
    if (!isVerified(signedIn)) {
      await signOut(auth)
      throw new EmailNotVerifiedError()
    }
  } finally {
    handlingUnverified = false
  }
  await saveProfile() // backfills accounts created before profiles existed
}

async function resendVerification(email: string, password: string) {
  handlingUnverified = true
  try {
    const signedIn = await checkedSignIn(email, password)
    try {
      if (!isVerified(signedIn)) await sendEmailVerification(signedIn, verificationSettings())
    } finally {
      await signOut(auth)
    }
  } finally {
    handlingUnverified = false
  }
}

async function loginWithGoogle() {
  await signInWithPopup(auth, googleProvider)
  await saveProfile()
}

async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<{ emailSent: boolean }> {
  handlingUnverified = true
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    try {
      if (displayName) await updateProfile(credential.user, { displayName })
      await sendEmailVerification(credential.user, verificationSettings())
      return { emailSent: true }
    } catch (err) {
      console.error('Sending the verification email failed:', err)
      return { emailSent: false }
    } finally {
      await signOut(auth)
    }
  } finally {
    handlingUnverified = false
  }
}

async function resetPassword(email: string) {
  await sendPasswordResetEmail(auth, email)
}

async function logout() {
  if (!auth.currentUser) return
  signingOut = true
  try {
    await signOut(auth)
  } catch (err) {
    signingOut = false
    throw err
  }
}

export function useAuth() {
  return {
    user: readonly(user),
    ready: readonly(ready),
    isSignedIn: computed(() => user.value !== null),
    isAdmin: readonly(isAdmin),
    loginWithEmail,
    loginWithGoogle,
    register,
    resendVerification,
    resetPassword,
    logout,
  }
}
