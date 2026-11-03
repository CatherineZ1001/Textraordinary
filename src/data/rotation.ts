import { dayNumber } from './dates'

/**
 * The daily challenge's scenario for a date ("YYYY-MM-DD"): the scenarios take turns in the
 * order given (by their `order` field), one per day, so every scenario comes up before any repeats.
 */
export function pickScenarioForDate<T>(date: string, scenarios: readonly T[]): T {
  const count = scenarios.length
  if (count === 0) throw new Error('There are no scenarios to choose a daily challenge from.')
  return scenarios[((dayNumber(date) % count) + count) % count]!
}
