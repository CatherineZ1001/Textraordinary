import type { Timestamp } from 'firebase/firestore'
import type { PracticeMode } from './scenario'

/** The scenario for one date */
export interface DailyChallenge {
  /** "YYYY-MM-DD"; a scheduled date's Firestore document is dailyChallenges/{date} */
  date: string
  scenarioId: string
  /** true if an administrator scheduled it; false for the automatic pick from the scenario list */
  scheduled: boolean
}

/** One round of a finished daily challenge */
export interface DailyRoundResult {
  mode: PracticeMode
  text: string
  /** null when the coach failed and the feedback was skipped */
  score: number | null
  verdict: string | null
}

/**
 * A member's official result for one day (Firestore: users/{uid}/dailyResults/{date}).
 * Written once when they finish that day's challenge and never changed; replays are not saved.
 */
export interface DailyResult {
  date: string
  scenarioId: string
  rounds: DailyRoundResult[]
  /** Average of the graded rounds, or null if none were graded */
  averageScore: number | null
  completedAt: Timestamp | null
}
