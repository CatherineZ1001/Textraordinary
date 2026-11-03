import type { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  email: string
  displayName: string
  provider: 'password' | 'google.com'
  createdAt: Timestamp
  /** Set to true in the Firebase console to make the user an administrator; members can't set it */
  admin?: boolean
}
