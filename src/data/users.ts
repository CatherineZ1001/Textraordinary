import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { db } from '@/firebase'

/** True if the user's profile has `admin: true` (set in the Firebase console). */
export async function hasAdminProfile(uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() && snap.data().admin === true
}

// Creates the user's profile document the first time they sign up or sign in.
// Safe to call repeatedly: an existing profile is left alone, so createdAt never changes.
// Accounts made before this existed get a profile the next time they sign in.
export async function ensureUserProfile(user: User, displayName?: string): Promise<void> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  const providerId = user.providerData[0]?.providerId
  await setDoc(ref, {
    email: user.email ?? '',
    displayName: (displayName || user.displayName || '').trim(),
    provider: providerId === 'google.com' ? 'google.com' : 'password',
    createdAt: serverTimestamp(),
  })
}
