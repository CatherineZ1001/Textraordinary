import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type DocumentReference,
  type QueryConstraint,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { averageScore } from './daily'
import { addDays } from './dates'
import type { ReplyEvaluation } from '@/ai/evaluateReply'
import type { Attempt, AttemptMode, AttemptRound, AttemptSource } from '@/types/attempt'
import type { Scenario, SubmittedReply } from '@/types/scenario'

// Saves attempt history (PBI 10): users/{uid}/attempts/{attemptId}, one document per attempt.
// The practice page calls `recorder.save()` after each round with everything so far; the first
// save creates the document and later ones add the new rounds. The security rules only let a
// member add rounds to their own unfinished attempts, never change or delete earlier ones.

/** The reply and the coach's feedback for one finished round, in the shape that is stored */
export function toAttemptRound(reply: SubmittedReply, grade: ReplyEvaluation | null): AttemptRound {
  return {
    mode: reply.mode,
    optionId: reply.mode === 'choose' ? reply.optionId : null,
    text: reply.text,
    score: grade?.score ?? null,
    verdict: grade?.verdict ?? null,
    toneMatch: grade?.toneMatch ?? null,
    strengths: grade?.strengths ?? [],
    improvements: grade?.improvements ?? [],
    suggestedRewrite: grade?.suggestedRewrite ?? '',
  }
}

/** One mode if every round used it, otherwise 'mixed' */
export function attemptMode(rounds: readonly Pick<AttemptRound, 'mode'>[]): AttemptMode {
  const modes = new Set(rounds.map((r) => r.mode))
  return modes.size === 1 ? [...modes][0]! : 'mixed'
}

export interface AttemptContext {
  uid: string
  scenario: Scenario
  source: AttemptSource
  /** The daily challenge's date, for 'daily' and 'replay' */
  dailyDate?: string
}

export interface AttemptRecorder {
  /**
   * Saves the attempt with every round finished so far. Calls run one after another, so a
   * quick Continue never overtakes the save before it. Rejects if the save failed; calling
   * it again retries with everything so far.
   */
  save(
    replies: readonly SubmittedReply[],
    grades: readonly (ReplyEvaluation | null)[],
  ): Promise<void>
  /** The document's id, once the first save has started */
  readonly id: string | null
}

/** Starts recording one attempt. Nothing is written until the first `save`. */
export function recordAttempt(context: AttemptContext): AttemptRecorder {
  let ref: DocumentReference | null = null
  let created = false
  let queue: Promise<unknown> = Promise.resolve()

  async function write(
    replies: readonly SubmittedReply[],
    grades: readonly (ReplyEvaluation | null)[],
  ) {
    const { uid, scenario, source } = context
    ref ??= doc(collection(db, 'users', uid, 'attempts'))
    const rounds = replies.map((reply, i) => toAttemptRound(reply, grades[i] ?? null))
    const completed = rounds.length >= scenario.rounds.length
    const progress = {
      mode: attemptMode(rounds),
      rounds,
      averageScore: averageScore(rounds),
      status: completed ? 'completed' : 'in-progress',
      updatedAt: serverTimestamp(),
      completedAt: completed ? serverTimestamp() : null,
    }

    if (created) {
      await updateDoc(ref, progress)
      return
    }
    await setDoc(ref, {
      scenarioId: scenario.id,
      scenarioTitle: scenario.title,
      category: scenario.category,
      source,
      dailyDate: source === 'practice' ? null : (context.dailyDate ?? null),
      roundCount: scenario.rounds.length,
      startedAt: serverTimestamp(),
      ...progress,
    })
    created = true
  }

  return {
    save(replies, grades) {
      const next = queue.then(() => write(replies, grades))
      // the next save waits for this one either way
      queue = next.catch(() => undefined)
      return next
    },
    get id() {
      return ref?.id ?? null
    },
  }
}

/** At most this many attempts are listed at once, newest first */
export const HISTORY_LIMIT = 200

/** Midnight at the start of a "YYYY-MM-DD" date, in the member's time zone */
function startOfDay(key: string): Timestamp {
  const [y = 0, m = 1, d = 1] = key.split('-').map(Number)
  return Timestamp.fromDate(new Date(y, m - 1, d))
}

/**
 * The member's attempts, newest first (PBI 17). `from` and `to` ("YYYY-MM-DD", both included,
 * in the member's time zone) limit it to attempts started on those days.
 */
export async function listAttempts(
  uid: string,
  range: { from?: string | null; to?: string | null } = {},
): Promise<Attempt[]> {
  const filters: QueryConstraint[] = []
  if (range.from) filters.push(where('startedAt', '>=', startOfDay(range.from)))
  if (range.to) filters.push(where('startedAt', '<', startOfDay(addDays(range.to, 1))))
  const snap = await getDocs(
    query(
      collection(db, 'users', uid, 'attempts'),
      ...filters,
      orderBy('startedAt', 'desc'),
      limit(HISTORY_LIMIT),
    ),
  )
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Attempt)
}
