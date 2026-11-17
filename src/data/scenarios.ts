import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import type { Scenario } from '@/types/scenario'

// Reads practice scenarios from the Firestore "scenarios" collection.
// Documents are written by scripts/seed-scenarios.mjs or the admin page, which check them against
// the Scenario shape, so they are trusted here. The document ID becomes the scenario's id.
// Reading requires a signed-in user (see the Firestore security rules).

/** All scenarios, sorted by their `order` field. Scenarios without `order` are left out. */
export async function listScenarios(): Promise<Scenario[]> {
  const snap = await getDocs(query(collection(db, 'scenarios'), orderBy('order')))
  return snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Scenario)
}

/** One scenario by id, or null if it does not exist. */
export async function getScenario(id: string): Promise<Scenario | null> {
  const snap = await getDoc(doc(db, 'scenarios', id))
  return snap.exists() ? ({ ...snap.data(), id: snap.id } as Scenario) : null
}

export async function createScenario(
  preferredId: string,
  data: Omit<Scenario, 'id'>,
): Promise<string> {
  const match = /^sc-(\d+)$/.exec(preferredId)
  let n = match ? Number(match[1]) : 1
  for (let tries = 0; tries < 20; tries++, n++) {
    const id = `sc-${String(n).padStart(3, '0')}`
    const ref = doc(db, 'scenarios', id)
    const created = await runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) return false
      tx.set(ref, data)
      return true
    })
    if (created) return id
  }
  throw new Error('Could not find a free scenario id.')
}

export async function updateScenario(id: string, data: Omit<Scenario, 'id'>): Promise<void> {
  await setDoc(doc(db, 'scenarios', id), data)
}

export async function listUpcomingSchedule(scenarioId: string, from: string): Promise<string[]> {
  const snap = await getDocs(
    query(collection(db, 'dailyChallenges'), where('scenarioId', '==', scenarioId)),
  )
  return snap.docs
    .map((d) => d.id)
    .filter((date) => date >= from)
    .sort()
}

export async function deleteScenario(id: string, upcomingDates: readonly string[]): Promise<void> {
  const batch = writeBatch(db)
  for (const date of upcomingDates) batch.delete(doc(db, 'dailyChallenges', date))
  batch.delete(doc(db, 'scenarios', id))
  await batch.commit()
}
