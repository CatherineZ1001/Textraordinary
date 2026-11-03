import { expect, test } from '@playwright/test'
import {
  createUser,
  dateKey,
  deleteDoc,
  makeAdmin,
  mockCoach,
  playOneRound,
  SCENARIO,
  signIn,
  writeDoc,
  type CoachGrade,
} from './helpers'

// Daily challenges (PBI 13, 14, 15, 18, 22). The fixture has one scenario, so it is every
// day's challenge, scheduled or not. Each test uses a fresh account, so it starts with no results and no streak.

const GOOD_GRADE: CoachGrade = {
  score: 9,
  verdict: 'Honest and solution-focused',
  toneMatch: 'on-target',
  strengths: ['Explains the delay and offers a new deadline.'],
  improvements: [],
  suggestedRewrite: '',
  likelyReaction: 'Jordan would appreciate the heads-up.',
  bestOptionLetter: 'B',
  bestOptionWhy: 'It is honest about the delay and offers a new deadline.',
}

test("TC-DC-01: play today's daily challenge once and keep the result", async ({ page }) => {
  await mockCoach(page, GOOD_GRADE)
  const user = await createUser('daily-play')
  await signIn(page, user)

  // The dashboard is the entry point: today's scenario and an empty streak
  const card = page.getByRole('region', { name: SCENARIO.title })
  await expect(card).toBeVisible()
  await expect(card.getByTestId('streak-current')).toHaveText('0')
  await card.getByRole('link', { name: "Play today's challenge" }).click()
  await expect(page).toHaveURL(/\/daily$/)

  await playOneRound(page, SCENARIO.options.B)
  await page.getByRole('button', { name: 'Finish scenario' }).click()

  // The result is saved and the official challenge can't be restarted
  await expect(page.getByText("Saved as today's result.")).toBeVisible()
  await expect(page.getByRole('button', { name: /Practice again/ })).toHaveCount(0)

  // Coming back shows the saved result instead of the phone
  await page.goto('/daily')
  await expect(page.getByRole('heading', { name: "You're done for today" })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Wake the phone' })).toHaveCount(0)
  await expect(page.getByText('Honest and solution-focused')).toBeVisible()
  await expect(page.getByTestId('streak-current')).toHaveText('1')

  // The dashboard shows today as done, with the streak started
  await page.goto('/dashboard')
  await expect(card.getByText('Done for today')).toBeVisible()
  await expect(card.getByText('9/10')).toBeVisible()
  await expect(card.getByRole('link', { name: 'See your result' })).toBeVisible()
  await expect(card.getByTestId('streak-current')).toHaveText('1')

  // The database itself refuses a second result for the same day
  const status = await writeDoc(
    `users/${user.uid}/dailyResults/${dateKey()}`,
    {
      scenarioId: { stringValue: SCENARIO.id },
      rounds: { arrayValue: { values: [] } },
      averageScore: { integerValue: '10' },
    },
    user.idToken,
  )
  expect(status).toBe(403)
})

test('TC-DC-02: replaying a past challenge does not change scores or the streak', async ({
  page,
}) => {
  await mockCoach(page, GOOD_GRADE)
  const user = await createUser('daily-replay')
  // Nothing is scheduled for yesterday, so it has the automatic pick (the only scenario)
  const yesterday = dateKey(-1)
  await signIn(page, user)

  await page.goto('/daily/archive')
  const replay = page.locator(`a[href="/daily/${yesterday}"]`)
  const row = page.getByRole('listitem').filter({ has: replay })
  await expect(row).toContainText(SCENARIO.title)
  await expect(row).toContainText('Not played')
  await replay.click()
  await expect(page).toHaveURL(new RegExp(`/daily/${yesterday}$`))

  await playOneRound(page, SCENARIO.options.B)
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(
    page.getByText("Replays don't count toward your daily results or streak."),
  ).toBeVisible()
  // Replays can be played again as often as the member likes
  await expect(page.getByRole('button', { name: /Practice again/ })).toBeVisible()

  // Nothing was recorded: still not played, no streak, today's challenge still open
  await page.goto('/daily/archive')
  await expect(row).toContainText('Not played')
  await page.goto('/dashboard')
  const card = page.getByRole('region', { name: SCENARIO.title })
  await expect(card.getByTestId('streak-current')).toHaveText('0')
  await expect(card.getByRole('link', { name: "Play today's challenge" })).toBeVisible()
})

test("TC-DC-03: today's date is never a replay", async ({ page }) => {
  const user = await createUser('daily-today')
  await signIn(page, user)
  await page.goto(`/daily/${dateKey()}`)
  await expect(page).toHaveURL(/\/daily$/)
  await expect(page.getByText(/^Daily challenge · /)).toBeVisible()
})

test('TC-DC-06: an admin schedules the daily challenge for the next days', async ({ page }) => {
  const tomorrow = dateKey(1)
  await deleteDoc(`dailyChallenges/${tomorrow}`) // start with tomorrow unscheduled, even on a retry
  const admin = await createUser('daily-admin')
  await signIn(page, admin)
  // Members can't make themselves admins
  expect(
    await writeDoc(
      `users/${admin.uid}?updateMask.fieldPaths=admin`,
      { admin: { booleanValue: true } },
      admin.idToken,
    ),
  ).toBe(403)
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)

  // Set in the console instead; a reload picks up the role
  await makeAdmin(admin.uid)
  await page.reload()
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click()
  await expect(page).toHaveURL(/\/admin\/scenarios$/)

  // Warned that tomorrow isn't scheduled
  const warning = page.getByRole('alert').filter({ hasText: 'Nothing is scheduled for tomorrow' })
  await expect(warning).toBeVisible()
  await expect(warning).toContainText(SCENARIO.title)

  // Fill the next 3 days from tomorrow
  await page.getByRole('checkbox', { name: SCENARIO.title }).check()
  await page.getByLabel('For the next').fill('3')
  await page.getByRole('button', { name: 'Schedule days' }).click()
  await expect(page.getByRole('status')).toContainText(/Scheduled \d days?/)
  await expect(warning).toHaveCount(0)
  const tomorrowRow = page.getByRole('row').filter({ hasText: 'Tomorrow' })
  await expect(tomorrowRow.getByRole('cell').last()).toHaveText('Scheduled')
  await expect(tomorrowRow.getByRole('combobox')).toHaveValue(SCENARIO.id)

  // Setting a day back to automatic brings the warning back
  await tomorrowRow.getByRole('combobox').selectOption('')
  await expect(warning).toBeVisible()
  await expect(tomorrowRow.getByRole('cell').last()).toHaveText('Automatic')

  // Members can't change the schedule
  const member = await createUser('daily-member')
  const status = await writeDoc(
    `dailyChallenges/${tomorrow}`,
    { scenarioId: { stringValue: SCENARIO.id } },
    member.idToken,
  )
  expect(status).toBe(403)
})
