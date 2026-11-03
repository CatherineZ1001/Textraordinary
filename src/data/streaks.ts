import { addDays } from './dates'

export interface Streak {
  /** Consecutive days completed, ending today (or yesterday, while today can still be played) */
  current: number
  /** The longest run of consecutive days ever completed */
  best: number
  doneToday: boolean
}

/**
 * Works out the daily-challenge streak from the dates ("YYYY-MM-DD") the member completed.
 * A missed day resets the current streak. Today only breaks it once the day is over, so a
 * streak that reached yesterday is still counted until midnight.
 */
export function calculateStreak(completedDates: Iterable<string>, today: string): Streak {
  const done = new Set(completedDates)
  const doneToday = done.has(today)

  let current = 0
  let day = doneToday ? today : addDays(today, -1)
  while (done.has(day)) {
    current++
    day = addDays(day, -1)
  }

  let best = 0
  for (const start of done) {
    if (done.has(addDays(start, -1))) continue // not the first day of a run
    let length = 0
    let next = start
    while (done.has(next)) {
      length++
      next = addDays(next, 1)
    }
    best = Math.max(best, length)
  }

  return { current, best, doneToday }
}
