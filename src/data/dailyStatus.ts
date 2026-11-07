// What happened to one day's daily challenge for a member (PBI 19). A challenge started but not
// finished by the end of its day is missed, the same as one never played: it has no result and
// breaks the streak, but the archive tells the two apart.

export type DailyDayStatus =
  /** Finished that day, with an official result */
  | 'completed'
  /** Started but not finished before the day ended */
  | 'missed'
  /** A past day the member never started */
  | 'not-played'
  /** Today, started and not finished yet */
  | 'in-progress'
  /** Today, not started yet */
  | 'open'

export function dailyDayStatus(
  date: string,
  today: string,
  day: { completed: boolean; started: boolean },
): DailyDayStatus {
  if (day.completed) return 'completed'
  if (date < today) return day.started ? 'missed' : 'not-played'
  return day.started ? 'in-progress' : 'open'
}
