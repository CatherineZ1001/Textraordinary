import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from '@/firebase'
import type { Scenario } from '@/types/scenario'

// Reads practice scenarios from the Firestore "scenarios" collection.
// Documents are written by scripts/seed-scenarios.mjs, which checks them against the Scenario
// shape, so they are trusted here. The document ID becomes the scenario's id.
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
