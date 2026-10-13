import { FirebaseError } from 'firebase/app'

const INVALID_CREDENTIALS = 'Incorrect email or password.'

const messages: Record<string, string | null> = {
  // Same message for all three so the form does not reveal which emails have accounts.
  'auth/invalid-credential': INVALID_CREDENTIALS,
  'auth/wrong-password': INVALID_CREDENTIALS,
  'auth/user-not-found': INVALID_CREDENTIALS,
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/missing-password': 'Please enter your password.',
  'auth/email-already-in-use': 'An account with this email already exists. Try signing in instead.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
  'auth/network-request-failed': 'Network error. Check your connection and try again.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-token-expired': 'Your session has expired. Please sign in again.',
  'auth/requires-recent-login': 'For your security, please sign in again to continue.',
  'auth/popup-blocked': 'The sign-in popup was blocked. Allow popups for this site and try again.',
  'auth/account-exists-with-different-credential':
    'An account already exists with this email using a different sign-in method.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled.',
  // The user closed the Google popup themselves; nothing to report.
  'auth/popup-closed-by-user': null,
  'auth/cancelled-popup-request': null,
}

/** Converts a Firebase auth error into a message for the user, or null if nothing should be shown. */
export function toAuthMessage(err: unknown): string | null {
  if (err instanceof FirebaseError && err.code in messages) {
    return messages[err.code] ?? null
  }
  console.error(err)
  return 'Something went wrong. Please try again.'
}
