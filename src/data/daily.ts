import {
  collection,
  doc,
  deleteDoc,
  documentId,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  writeBatch,
  type DocumentSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { getScenario, listScenarios } from './scenarios'
import { addDays, localDateKey } from './dates'
import { pickScenarioForDate } from './rotation'
import { calculateStreak, type Streak } from './streaks'
import type { DailyChallenge, DailyResult, DailyRoundResult } from '@/types/daily'
import type { Scenario, SubmittedReply } from '@/types/scenario'

// Daily challenges (PBI 13): one scenario per date, shared by every member.
// Administrators schedule scenarios ahead of time in dailyChallenges/{YYYY-MM-DD} (see the admin
// page). A date with nothing scheduled falls back to the scenario list, which takes turns in
// `order` (src/data/rotation.ts), so every date always has a challenge without anything being written.
// A member's official result is users/{uid}/dailyResults/{YYYY-MM-DD}. The rules only allow
// creating it, never changing it, so each day's challenge counts once (PBI 15).

/** Average of the graded rounds, to one decimal place; null if none were graded. */
export function averageScore(results: readonly ({ score: number | null } | null)[]): number | null {
  const scores = results.flatMap((r) => (r && r.score !== null ? [r.score] : []))
  if (!scores.length) return null
  return Math.round((scores.reduce((sum, s) => sum + s, 0) / scores.length) * 10) / 10
}

const challengeRef = (date: string) => doc(db, 'dailyChallenges', date)
const resultRef = (uid: string, date: string) => doc(db, 'users', uid, 'dailyResults', date)

function toResult(snap: DocumentSnapshot): DailyResult {
  const data = snap.data() ?? {}
  return {
    date: snap.id,
    scenarioId: data.scenarioId,
    rounds: data.rounds ?? [],
    averageScore: data.averageScore ?? null,
    completedAt: data.completedAt ?? null,
  }
}

/** The scheduled scenario, or the automatic pick from the scenario list when nothing is scheduled */
function resolveChallenge(
  date: string,
  scheduledId: string | undefined,
  scenarios: readonly Scenario[],
): DailyChallenge {
  return scheduledId
    ? { date, scenarioId: scheduledId, scheduled: true }
    : { date, scenarioId: pickScenarioForDate(date, scenarios).id, scheduled: false }
}

/** The challenge for one date. */
export async function getDailyChallenge(date: string): Promise<DailyChallenge> {
  const snap = await getDoc(challengeRef(date))
  if (snap.exists()) return { date, scenarioId: snap.data().scenarioId, scheduled: true }
  return resolveChallenge(date, undefined, await listScenarios())
}

/** The challenge for every date from `from` to `to` (inclusive), oldest first. */
export async function listDailyChallenges(from: string, to: string): Promise<DailyChallenge[]> {
  const [snap, scenarios] = await Promise.all([
    getDocs(
      query(
        collection(db, 'dailyChallenges'),
        where(documentId(), '>=', from),
        where(documentId(), '<=', to),
        orderBy(documentId()),
      ),
    ),
    listScenarios(),
  ])
  const scheduled = new Map(snap.docs.map((d) => [d.id, d.data().scenarioId as string]))
  const days: DailyChallenge[] = []
  for (let date = from; date <= to; date = addDays(date, 1)) {
    days.push(resolveChallenge(date, scheduled.get(date), scenarios))
  }
  return days
}

/** Administrators only: schedules a scenario for each date, replacing anything already there. */
export async function scheduleDailyChallenges(
  entries: readonly { date: string; scenarioId: string }[],
): Promise<void> {
  // A batch holds at most 500 writes
  for (let i = 0; i < entries.length; i += 500) {
    const batch = writeBatch(db)
    for (const { date, scenarioId } of entries.slice(i, i + 500)) {
      batch.set(challengeRef(date), { scenarioId, updatedAt: serverTimestamp() })
    }
    await batch.commit()
  }
}

/** Administrators only: clears a date's schedule, so it goes back to the automatic pick. */
export async function unscheduleDailyChallenge(date: string): Promise<void> {
  await deleteDoc(challengeRef(date))
}

/** The member's official result for a date, or null if they haven't completed it. */
export async function getDailyResult(uid: string, date: string): Promise<DailyResult | null> {
  const snap = await getDoc(resultRef(uid, date))
  return snap.exists() ? toResult(snap) : null
}

/** Every official daily result the member has. */
export async function listDailyResults(uid: string): Promise<DailyResult[]> {
  const snap = await getDocs(collection(db, 'users', uid, 'dailyResults'))
  return snap.docs.map(toResult)
}

/**
 * Saves the member's official result for `date`. If they already finished that day (say, in
 * another tab), nothing is written and the first result is returned with `duplicate: true`.
 */
export async function saveDailyResult(
  uid: string,
  date: string,
  scenarioId: string,
  replies: readonly SubmittedReply[],
  grades: readonly ({ score: number; verdict: string } | null)[],
): Promise<{ result: DailyResult; duplicate: boolean }> {
  const rounds: DailyRoundResult[] = replies.map((reply, i) => ({
    mode: reply.mode,
    text: reply.text,
    score: grades[i]?.score ?? null,
    verdict: grades[i]?.verdict ?? null,
  }))
  const average = averageScore(rounds)
  const ref = resultRef(uid, date)

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists()) return { result: toResult(snap), duplicate: true }
    tx.set(ref, { scenarioId, rounds, averageScore: average, completedAt: serverTimestamp() })
    return {
      result: { date, scenarioId, rounds, averageScore: average, completedAt: null },
      duplicate: false,
    }
  })
}

export interface DailyOverview {
  challenge: DailyChallenge
  /** null if the challenge's scenario was deleted */
  scenario: Scenario | null
  /** Today's official result, if the member has finished it */
  result: DailyResult | null
  streak: Streak
}

/** Everything the dashboard card and the daily page show about today's challenge. */
export async function getDailyOverview(
  uid: string,
  today = localDateKey(),
): Promise<DailyOverview> {
  const [challenge, results] = await Promise.all([getDailyChallenge(today), listDailyResults(uid)])
  const result = results.find((r) => r.date === today) ?? null
  return {
    challenge,
    // After finishing, show the scenario they played, even if the schedule changed since
    scenario: await getScenario(result?.scenarioId ?? challenge.scenarioId),
    result,
    streak: calculateStreak(
      results.map((r) => r.date),
      today,
    ),
  }
}
