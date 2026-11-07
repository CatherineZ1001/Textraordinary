import type { Timestamp } from 'firebase/firestore'
import type { ToneMatch } from '@/ai/evaluateReply'
import type { PracticeMode, ScenarioCategory } from './scenario'

// Attempt history (PBI 10): one document per time a member plays a scenario, in every practice
// mode (picked or written replies, regular practice, daily challenges and their replays).
// Firestore: users/{uid}/attempts/{attemptId}. The attempt is saved after each round, so an
// attempt the member leaves halfway is kept too, as 'in-progress'.

/** Where the attempt was played */
export type AttemptSource = 'practice' | 'daily' | 'replay'

/** The attempt's practice mode; 'mixed' when the member switched modes between rounds */
export type AttemptMode = PracticeMode | 'mixed'

/** One submitted reply and the coach's feedback on it */
export interface AttemptRound {
  mode: PracticeMode
  /** The suggested reply's id when it was picked, otherwise null */
  optionId: string | null
  text: string
  /** null when the coach failed and the feedback was skipped */
  score: number | null
  verdict: string | null
  toneMatch: ToneMatch | null
  strengths: string[]
  improvements: string[]
  suggestedRewrite: string
}

export interface Attempt {
  id: string
  scenarioId: string
  /** Copied from the scenario, so the history still reads well if the scenario changes later */
  scenarioTitle: string
  category: ScenarioCategory
  source: AttemptSource
  /** The daily challenge's date ("YYYY-MM-DD") for 'daily' and 'replay', otherwise null */
  dailyDate: string | null
  mode: AttemptMode
  /** How many rounds the scenario has; the attempt is complete once `rounds` has that many */
  roundCount: number
  rounds: AttemptRound[]
  /** Average of the graded rounds, or null if none were graded */
  averageScore: number | null
  status: 'in-progress' | 'completed'
  /** null only in the moment before the server sets the time */
  startedAt: Timestamp | null
  updatedAt: Timestamp | null
  completedAt: Timestamp | null
}
