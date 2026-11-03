import { expect, test } from '@playwright/test'
import { calculateStreak } from '../src/data/streaks'
import { pickScenarioForDate } from '../src/data/rotation'

// The streak and scenario-rotation rules (PBI 13, 18). These are plain functions, so the tests
// call them directly instead of going through the browser.

const TODAY = '2026-03-10'

test.describe('TC-DC-04: daily-challenge streaks', () => {
  test('no results means no streak', () => {
    expect(calculateStreak([], TODAY)).toEqual({ current: 0, best: 0, doneToday: false })
  })

  test('consecutive days ending today count', () => {
    const streak = calculateStreak(['2026-03-08', '2026-03-09', '2026-03-10'], TODAY)
    expect(streak).toEqual({ current: 3, best: 3, doneToday: true })
  })

  test('a streak through yesterday is still alive until today is over', () => {
    const streak = calculateStreak(['2026-03-08', '2026-03-09'], TODAY)
    expect(streak).toEqual({ current: 2, best: 2, doneToday: false })
  })

  test('a missed day resets the streak but keeps the best run', () => {
    const dates = [
      '2026-03-01',
      '2026-03-02',
      '2026-03-03',
      '2026-03-04',
      '2026-03-07',
      '2026-03-10',
    ]
    expect(calculateStreak(dates, TODAY)).toEqual({ current: 1, best: 4, doneToday: true })
    expect(calculateStreak(dates.slice(0, 4), TODAY)).toEqual({
      current: 0,
      best: 4,
      doneToday: false,
    })
  })

  test('runs cross month and year boundaries', () => {
    const streak = calculateStreak(['2025-12-30', '2025-12-31', '2026-01-01'], '2026-01-01')
    expect(streak.current).toBe(3)
    const leap = calculateStreak(['2028-02-28', '2028-02-29', '2028-03-01'], '2028-03-01')
    expect(leap.current).toBe(3)
  })
})

test('TC-DC-05: scenarios take turns as the daily challenge', () => {
  const scenarios = ['sc-001', 'sc-002', 'sc-003'].map((id) => ({ id }))
  const days = ['2026-03-10', '2026-03-11', '2026-03-12', '2026-03-13']
  const picks = days.map((d) => pickScenarioForDate(d, scenarios).id)
  // One a day, every scenario before any repeats, and the same date always gets the same one
  expect(new Set(picks.slice(0, 3)).size).toBe(3)
  expect(picks[3]).toBe(picks[0])
  expect(pickScenarioForDate('2026-03-10', scenarios).id).toBe(picks[0])
  expect(() => pickScenarioForDate('2026-03-10', [])).toThrow()
})
