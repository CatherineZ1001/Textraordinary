import type { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  email: string
  displayName: string
  provider: 'password' | 'google.com'
  createdAt: Timestamp
}
