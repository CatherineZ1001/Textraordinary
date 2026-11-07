import { expect, test } from '@playwright/test'
import {
  createUser,
  dateKey,
  deleteDocAs,
  mockCoach,
  openScenario,
  playOneRound,
  readCollection,
  SCENARIO,
  signIn,
  writeDoc,
  type CoachGrade,
} from './helpers'

// Attempt history (PBI 10): every attempt, in any practice mode, is saved to
// users/{uid}/attempts with the reply, score, feedback, mode and time. Each test uses a fresh
// account, so its history starts empty.

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

/** An attempt document as plain JSON */
interface Saved {
  [field: string]: unknown
  rounds: Record<string, unknown>[]
}

test('TC-AH-01: a finished practice attempt is saved with its reply, score, feedback and mode', async ({
  page,
}) => {
  await mockCoach(page, GOOD_GRADE)
  const user = await createUser('history-save')
  await signIn(page, user)

  await openScenario(page, 'Pick a reply')
  await page.getByRole('button', { name: SCENARIO.options.B }).click()
  await page.getByRole('button', { name: 'Send reply' }).click()
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(page.getByText('Saved to your practice history.')).toBeVisible()

  const { docs } = await readCollection<Saved>(`users/${user.uid}/attempts`)
  expect(docs).toHaveLength(1)
  const attempt = docs[0]!
  expect(attempt).toMatchObject({
    scenarioId: SCENARIO.id,
    scenarioTitle: SCENARIO.title,
    category: 'professional',
    source: 'practice',
    dailyDate: null,
    mode: 'choose',
    roundCount: 1,
    averageScore: 9,
    status: 'completed',
  })
  expect(attempt.startedAt).toBeTruthy()
  expect(attempt.completedAt).toBeTruthy()
  expect(attempt.rounds).toEqual([
    {
      mode: 'choose',
      optionId: 'b',
      text: SCENARIO.options.B,
      score: 9,
      verdict: 'Honest and solution-focused',
      toneMatch: 'on-target',
      strengths: ['Explains the delay and offers a new deadline.'],
      improvements: [],
      suggestedRewrite: '',
    },
  ])

  // "Practice again" is a separate attempt
  await page.getByRole('button', { name: /Practice again/ }).click()
  await playOneRound(page, SCENARIO.options.D)
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(page.getByText('Saved to your practice history.')).toBeVisible()
  const again = await readCollection<Saved>(`users/${user.uid}/attempts`)
  expect(again.docs).toHaveLength(2)
  expect(again.docs.map((d) => d.rounds[0]?.optionId).sort()).toEqual(['b', 'd'])
})

test('TC-AH-02: written replies and daily challenges use the same history', async ({ page }) => {
  await mockCoach(page, { ...GOOD_GRADE, bestOptionLetter: undefined, bestOptionWhy: undefined })
  const user = await createUser('history-modes')
  await signIn(page, user)

  // A written reply
  await openScenario(page, 'Write your own')
  await page.getByRole('textbox', { name: 'Your reply' }).fill('Running behind, can we do Tuesday?')
  await page.getByRole('button', { name: 'Send reply' }).click()
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(page.getByText('Saved to your practice history.')).toBeVisible()

  // Today's daily challenge
  await page.goto('/daily')
  await playOneRound(page, SCENARIO.options.B)
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(page.getByText("Saved as today's result.")).toBeVisible()
  await expect(page.getByText('Saved to your practice history.')).toBeVisible()

  const { docs } = await readCollection<Saved>(`users/${user.uid}/attempts`)
  const bySource = Object.fromEntries(docs.map((d) => [d.source as string, d]))
  expect(bySource.practice).toMatchObject({ mode: 'write', dailyDate: null })
  expect(bySource.practice?.rounds[0]).toMatchObject({
    mode: 'write',
    optionId: null,
    text: 'Running behind, can we do Tuesday?',
  })
  expect(bySource.daily).toMatchObject({
    mode: 'choose',
    dailyDate: dateKey(),
    status: 'completed',
  })
})

test('TC-AH-03: only the member can read their history, and it cannot be changed or deleted', async ({
  page,
}) => {
  await mockCoach(page, GOOD_GRADE)
  const user = await createUser('history-owner')
  await signIn(page, user)
  await openScenario(page, 'Pick a reply')
  await page.getByRole('button', { name: SCENARIO.options.D }).click()
  await page.getByRole('button', { name: 'Send reply' }).click()
  await page.getByRole('button', { name: 'Finish scenario' }).click()
  await expect(page.getByText('Saved to your practice history.')).toBeVisible()

  const mine = await readCollection<Saved>(`users/${user.uid}/attempts`, user.idToken)
  expect(mine.status).toBe(200)
  expect(mine.docs).toHaveLength(1)
  const path = `users/${user.uid}/attempts/${mine.docs[0]!.id}`

  // Another member can't see it
  const other = await createUser('history-other')
  expect((await readCollection(`users/${user.uid}/attempts`, other.idToken)).status).toBe(403)

  // The member can't raise the score of a finished attempt or delete it
  const raised = await writeDoc(
    `${path}?updateMask.fieldPaths=averageScore`,
    { averageScore: { integerValue: '10' } },
    user.idToken,
  )
  expect(raised).toBe(403)
  expect(await deleteDocAs(path, user.idToken)).toBe(403)

  // Nothing changed
  const after = await readCollection<Saved>(`users/${user.uid}/attempts`)
  expect(after.docs).toHaveLength(1)
  expect(after.docs[0]?.averageScore).toBe(9)
})
