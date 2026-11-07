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
} from './helpers'

// Practice history page (PBI 17): the member's saved attempts with date, scenario, mode and
// score, filtered by date. Attempts are seeded straight into the emulator on chosen dates.

function round(mode: 'choose' | 'write', text: string, score: number | null, verdict: string) {
  return {
    mode,
    optionId: mode === 'choose' ? 'b' : null,
    text,
    score,
    verdict: score === null ? null : verdict,
    toneMatch: score === null ? null : 'close',
    strengths: [],
    improvements: score !== null && score < 8 ? ['Offer a new deadline.'] : [],
    suggestedRewrite: '',
  }
}

async function seedAttempt(
  uid: string,
  id: string,
  daysAgo: number,
  attempt: Record<string, unknown> & { rounds: unknown[] },
) {
  const started = noonDaysAgo(daysAgo)
  const status = await writeDoc(
    `users/${uid}/attempts/${id}`,
    toFields({
      scenarioId: SCENARIO.id,
      scenarioTitle: SCENARIO.title,
      category: 'professional',
      dailyDate: null,
      startedAt: started,
      updatedAt: started,
      ...attempt,
    }),
  )
  expect(status).toBe(200)
}

test('TC-AH-04: the history page lists attempts and filters them by date', async ({ page }) => {
  const user = await createUser('history-page')
  await seedAttempt(user.uid, 'today', 0, {
    source: 'practice',
    mode: 'choose',
    roundCount: 1,
    rounds: [round('choose', SCENARIO.options.B, 9, 'Honest and solution-focused')],
    averageScore: 9,
    status: 'completed',
    completedAt: noonDaysAgo(0),
  })
  await seedAttempt(user.uid, 'ten-days', 10, {
    source: 'daily',
    dailyDate: dateKey(-10),
    mode: 'write',
    roundCount: 1,
    rounds: [round('write', 'Can we push it to Tuesday?', 6, 'Clear but abrupt')],
    averageScore: 6,
    status: 'completed',
    completedAt: noonDaysAgo(10),
  })
  await seedAttempt(user.uid, 'old-unfinished', 45, {
    source: 'practice',
    mode: 'mixed',
    roundCount: 2,
    rounds: [round('write', 'Sorry, running late on this one.', null, '')],
    averageScore: null,
    status: 'in-progress',
    completedAt: null,
  })
  await signIn(page, user)

  // Reachable from the nav bar
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: 'History' })
    .click()
  await expect(page).toHaveURL(/\/history$/)
  await expect(page.getByRole('heading', { name: 'Practice history' })).toBeVisible()

  // All time: every attempt, newest first, with totals
  const rows = page.getByTestId('history-row')
  await expect(rows).toHaveCount(3)
  await expect(page.getByTestId('history-count')).toHaveText('3')
  await expect(page.getByTestId('history-average')).toContainText('7.5')
  await expect(rows.nth(0)).toContainText(SCENARIO.title)
  await expect(rows.nth(0)).toContainText('Pick a reply')
  await expect(rows.nth(0)).toContainText('9/10')
  await expect(rows.nth(1)).toContainText('Write your own')
  await expect(rows.nth(1)).toContainText('Daily challenge')
  await expect(rows.nth(1)).toContainText('6/10')
  await expect(rows.nth(2)).toContainText('Mixed')
  await expect(rows.nth(2)).toContainText('Unfinished · 1 of 2 rounds')

  // Opening an attempt shows its replies and grades
  await rows.nth(1).getByText(SCENARIO.title).click()
  await expect(rows.nth(1).getByText('Can we push it to Tuesday?')).toBeVisible()
  await expect(rows.nth(1).getByText('Round 1 · 6/10 · Clear but abrupt')).toBeVisible()
  await expect(rows.nth(1).getByText('Offer a new deadline.')).toBeVisible()

  // Date filters
  const dates = page.getByRole('radiogroup', { name: 'Dates' })
  await dates.getByRole('radio', { name: 'Last 7 days' }).click()
  await expect(rows).toHaveCount(1)
  await expect(rows.nth(0)).toContainText('9/10')

  await dates.getByRole('radio', { name: 'Last 30 days' }).click()
  await expect(rows).toHaveCount(2)

  await dates.getByRole('radio', { name: 'Custom' }).click()
  await page.getByLabel('From', { exact: true }).fill(dateKey(-50))
  await page.getByLabel('To', { exact: true }).fill(dateKey(-40))
  await expect(rows).toHaveCount(1)
  await expect(rows.nth(0)).toContainText('Unfinished')

  await page.getByLabel('From', { exact: true }).fill(dateKey(-60))
  await page.getByLabel('To', { exact: true }).fill(dateKey(-55))
  await expect(page.getByText('No attempts between these dates.')).toBeVisible()

  await page.getByLabel('From', { exact: true }).fill(dateKey(-1))
  await page.getByLabel('To', { exact: true }).fill(dateKey(-5))
  await expect(page.getByRole('alert')).toHaveText('The start date is after the end date.')
})

test('TC-AH-05: a scenario just played shows up in the history', async ({ page }) => {
  await mockCoach(page, {
    score: 8,
    verdict: 'Clear and kind',
    toneMatch: 'on-target',
    strengths: ['Polite'],
    improvements: [],
    suggestedRewrite: '',
    likelyReaction: 'Jordan would be fine with it.',
    bestOptionLetter: 'B',
    bestOptionWhy: 'It offers a new deadline.',
  })
  const user = await createUser('history-new')
  await signIn(page, user)

  await page.goto('/history')
  await expect(page.getByText("You haven't played any scenarios yet.")).toBeVisible()

  await page.goto(`/practice/${SCENARIO.id}`)
  await playOneRound(page, SCENARIO.options.B)
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await page.getByRole('link', { name: 'See your history' }).click()
  await expect(page).toHaveURL(/\/history$/)

  const rows = page.getByTestId('history-row')
  await expect(rows).toHaveCount(1)
  await expect(rows.nth(0)).toContainText(SCENARIO.title)
  await expect(rows.nth(0)).toContainText('Pick a reply')
  await expect(rows.nth(0)).toContainText('8/10')
})
