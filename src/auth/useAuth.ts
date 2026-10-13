import { computed, readonly, ref, shallowRef, triggerRef } from 'vue'
import {
  createUserWithEmailAndPassword,
  onIdTokenChanged,
  reload,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { auth, googleProvider } from '@/firebase'

const user = shallowRef<User | null>(null)
const ready = ref(false)

let resolveReady: () => void
/** Resolves once Firebase has restored (or failed to restore) the saved session. */
export const authReady = new Promise<void>((resolve) => (resolveReady = resolve))

let signingOut = false
let sessionLostHandler: (() => void) | null = null

/** Registers a callback for when the user is signed out without calling logout() (revoked, disabled, expired). */
export function onSessionLost(handler: () => void) {
  sessionLostHandler = handler
}

onIdTokenChanged(auth, (next) => {
  const wasSignedIn = user.value !== null
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

// Re-check when the user returns to the tab, at most once a minute.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && Date.now() - lastVerified > 60_000) {
    void verifyUser()
  }
})

async function loginWithEmail(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password)
}

async function loginWithGoogle() {
  await signInWithPopup(auth, googleProvider)
}

async function register(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password)
  if (displayName) {
    await updateProfile(credential.user, { displayName })
    // updateProfile mutates the existing User object, so tell Vue it changed.
    triggerRef(user)
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
    loginWithEmail,
    loginWithGoogle,
    register,
    resetPassword,
    logout,
  }
}
