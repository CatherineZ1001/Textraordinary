import { expect, test } from '@playwright/test'
import { dailyDayStatus } from '../src/data/dailyStatus'
import {
  createUser,
  dateKey,
  mockCoach,
  playOneRound,
  readDocFields,
  SCENARIO,
  signIn,
  writeDoc,
  type CoachGrade,
} from './helpers'

// Missed daily challenges (PBI 19): a daily challenge started but not finished by the end of its
// day counts as missed. It saves no result, so the streak breaks, and the archive shows it as
// "Missed" rather than "Not played".

const GRADE: CoachGrade = {
  score: 8,
  verdict: 'Clear and polite',
  toneMatch: 'on-target',
  strengths: ['Explains the delay.'],
  improvements: [],
  suggestedRewrite: '',
  likelyReaction: 'Jordan would be fine with it.',
  bestOptionLetter: 'B',
  bestOptionWhy: 'It offers a new deadline.',
}

test('TC-DC-07: what counts as a missed day', () => {
  const today = '2026-03-10'
  const status = (date: string, completed: boolean, started: boolean) =>
    dailyDayStatus(date, today, { completed, started })
  expect(status('2026-03-09', false, true)).toBe('missed')
  expect(status('2026-03-09', false, false)).toBe('not-played')
  expect(status('2026-03-09', true, true)).toBe('completed')
  // Today isn't over yet, so a started challenge can still be finished
  expect(status(today, false, true)).toBe('in-progress')
  expect(status(today, false, false)).toBe('open')
  expect(status(today, true, true)).toBe('completed')
})

test('TC-DC-08: starting the daily challenge is recorded, and an unfinished day shows as missed', async ({
  page,
}) => {
  await mockCoach(page, GRADE)
  const user = await createUser('daily-missed')
  await signIn(page, user)

  // Sending the first reply records the start, but no result until it's finished
  await page.goto('/daily')
  await playOneRound(page, SCENARIO.options.B)
  await expect(page.getByRole('button', { name: 'Finish scenario' })).toBeVisible()
  await expect
    .poll(() => readDocFields(`users/${user.uid}/dailyStarts/${dateKey()}`))
    .toMatchObject({ scenarioId: { stringValue: SCENARIO.id } })
  expect(await readDocFields(`users/${user.uid}/dailyResults/${dateKey()}`)).toBeNull()

  // The dashboard reminds them to finish it
  await page.goto('/dashboard')
  await expect(page.getByText(/finish it before midnight or it counts as missed/)).toBeVisible()

  // Yesterday was started and never finished; the day before was never started
  const yesterday = dateKey(-1)
  const status = await writeDoc(`users/${user.uid}/dailyStarts/${yesterday}`, {
    scenarioId: { stringValue: SCENARIO.id },
    startedAt: { timestampValue: new Date(Date.now() - 86_400_000).toISOString() },
  })
  expect(status).toBe(200)

  await page.goto('/daily/archive')
  const rowFor = (date: string) =>
    page.getByRole('listitem').filter({ has: page.locator(`a[href="/daily/${date}"]`) })
  await expect(rowFor(yesterday)).toContainText('Missed')
  await expect(rowFor(dateKey(-2))).toContainText('Not played')
})

test('TC-DC-09: members cannot fake or remove a start', async () => {
  const user = await createUser('daily-start-rules')
  const fields = {
    scenarioId: { stringValue: SCENARIO.id },
    startedAt: { timestampValue: new Date().toISOString() },
  }
  // Not for a day long past
  expect(await writeDoc(`users/${user.uid}/dailyStarts/${dateKey(-5)}`, fields, user.idToken)).toBe(
    403,
  )
  // Not for someone else
  const other = await createUser('daily-start-other')
  expect(await writeDoc(`users/${other.uid}/dailyStarts/${dateKey()}`, fields, user.idToken)).toBe(
    403,
  )
  // A start already there can't be changed
  expect(await writeDoc(`users/${user.uid}/dailyStarts/${dateKey()}`, fields)).toBe(200)
  expect(
    await writeDoc(
      `users/${user.uid}/dailyStarts/${dateKey()}?updateMask.fieldPaths=scenarioId`,
      { scenarioId: { stringValue: 'something-else' } },
      user.idToken,
    ),
  ).toBe(403)
})

test("TC-DC-10: a challenge still unfinished at midnight is missed, and the next day's is ready", async ({
  page,
}) => {
  // The browser's clock starts a minute before midnight
  const almostMidnight = new Date()
  almostMidnight.setHours(23, 59, 0, 0)
  await page.clock.install({ time: almostMidnight })
  await mockCoach(page, GRADE)
  const user = await createUser('daily-midnight')
  await signIn(page, user)

  await page.goto('/daily')
  await playOneRound(page, SCENARIO.options.B)
  await expect(page.getByRole('button', { name: 'Finish scenario' })).toBeVisible()

  // Midnight passes before they finish
  await page.clock.fastForward('02:00')
  await expect(page.getByRole('heading', { name: "Time's up" })).toBeVisible()
  await expect(page.getByText('this challenge counts as missed')).toBeVisible()
  expect(await readDocFields(`users/${user.uid}/dailyResults/${dateKey()}`)).toBeNull()

  // The new day's challenge starts fresh
  await page.getByRole('button', { name: "Play today's challenge" }).click()
  // The phone was already unlocked, so the new day's messages play without the lock screen
  await expect(page.getByRole('button', { name: SCENARIO.options.B })).toBeVisible()
  expect(await readDocFields(`users/${user.uid}/dailyResults/${dateKey(1)}`)).toBeNull()
})
