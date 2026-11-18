import { expect, test } from '@playwright/test'
import {
  createUser,
  dateKey,
  mockCoach,
  noonDaysAgo,
  playOneRound,
  SCENARIO,
  signIn,
  toFields,
  writeDoc,
  type CoachGrade,
} from './helpers'

// TC-DC-02 (PBI 18, 19): the streak grows on consecutive days and resets after a missed day.
// Days before today are seeded straight into the emulator. The later days are reached by moving
// the browser's clock forward, since a result can only be saved for the real current day.

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

const DAY = 86_400_000

test('TC-DC-02: the streak grows on consecutive days and resets after a missed day', async ({
  page,
}) => {
  test.slow() // three days and several page loads; can pass 30s when the suite runs in parallel
  const now = new Date()
  await page.clock.install({ time: now })
  await mockCoach(page, GRADE)
  const user = await createUser('daily-streak')

  // Precondition: a 2-day streak (yesterday and the day before)
  for (const daysAgo of [2, 1]) {
    const status = await writeDoc(
      `users/${user.uid}/dailyResults/${dateKey(-daysAgo)}`,
      toFields({
        scenarioId: SCENARIO.id,
        rounds: [{ mode: 'choose', text: SCENARIO.options.B, score: 8, verdict: 'Clear' }],
        averageScore: 8,
        completedAt: noonDaysAgo(daysAgo),
      }),
    )
    expect(status).toBe(200)
  }
  await signIn(page, user)
  const card = page.getByRole('region', { name: SCENARIO.title })
  await expect(card.getByTestId('streak-current')).toHaveText('2')

  // 1) Completing today's challenge makes it 3
  await card.getByRole('link', { name: "Play today's challenge" }).click()
  await playOneRound(page, SCENARIO.options.B)
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(page.getByText("Saved as today's result.")).toBeVisible()
  await page.goto('/dashboard')
  await expect(card.getByTestId('streak-current')).toHaveText('3')

  // 2) The next day, the challenge is started but not finished before midnight.
  // The start is written directly: the database only accepts starts for the real current day.
  const tomorrow = dateKey(1)
  const started = await writeDoc(
    `users/${user.uid}/dailyStarts/${tomorrow}`,
    toFields({ scenarioId: SCENARIO.id, startedAt: new Date(now.getTime() + DAY) }),
  )
  expect(started).toBe(200)

  // 3) The day after, the streak is back to 0, with the best run kept
  await page.clock.setSystemTime(now.getTime() + 2 * DAY)
  await page.goto('/dashboard')
  await expect(card.getByTestId('streak-current')).toHaveText('0')
  await expect(card.getByText('Best: 3 days')).toBeVisible()

  // Postcondition: the missed day is in the challenge history
  await page.goto('/daily/archive')
  const rowFor = (date: string) =>
    page.getByRole('listitem').filter({ has: page.locator(`a[href="/daily/${date}"]`) })
  await expect(rowFor(tomorrow)).toContainText('Missed')
  await expect(rowFor(dateKey())).not.toContainText('Missed')
})
