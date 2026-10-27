import { expect, test } from '@playwright/test'
import { mockCoach, openScenario, SCENARIO, signIn } from './helpers'

test('TC-SR-01: select a suggested reply and get it evaluated', async ({ page }) => {
  const coach = await mockCoach(page, {
    score: 3,
    verdict: 'Leaves Jordan hanging',
    toneMatch: 'off',
    strengths: ['Short and polite'],
    improvements: ["It dodges Jordan's question and doesn't mention the delay."],
    suggestedRewrite: '',
    likelyReaction: 'Jordan would be frustrated not to get an answer.',
    bestOptionLetter: 'B',
    bestOptionWhy: 'It is honest about the delay and offers a new deadline.',
  })
  await signIn(page)
  await openScenario(page, 'Pick a reply')

  // 1) Send is disabled until a reply is selected
  const send = page.getByRole('button', { name: 'Send reply' })
  await expect(send).toBeDisabled()

  // 2-3) Only the most recently selected option is highlighted
  const optionB = page.getByRole('button', { name: SCENARIO.options.B })
  const optionD = page.getByRole('button', { name: SCENARIO.options.D })
  await optionB.click()
  await expect(optionB).toHaveAttribute('aria-pressed', 'true')
  await optionD.click()
  await expect(optionD).toHaveAttribute('aria-pressed', 'true')
  await expect(optionB).toHaveAttribute('aria-pressed', 'false')

  // 4) Send it
  await expect(send).toBeEnabled()
  await send.click()
  await expect(page.getByRole('region', { name: 'Conversation' })).toContainText(
    SCENARIO.options.D,
  )

  // 5) Feedback says whether it was appropriate, why, and names B as the best choice
  await expect(page.getByRole('heading', { name: 'Leaves Jordan hanging' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Score: 3 out of 10' })).toBeVisible()
  await expect(
    page.getByText("It dodges Jordan's question and doesn't mention the delay."),
  ).toBeVisible()
  const best = page.locator('section', {
    has: page.getByRole('heading', { name: 'The best reply' }),
  })
  await expect(best.getByText('B', { exact: true })).toBeVisible()
  await expect(best).toContainText(SCENARIO.options.B)
  await expect(best).toContainText(
    'Why it works: It is honest about the delay and offers a new deadline.',
  )
  // The coach was told which option was picked
  expect(coach.requests).toHaveLength(1)
  expect(coach.requests[0]).toContain('The user picked: D')

  // Postcondition: the feedback stays up until the user moves on
  await expect(page.getByRole('button', { name: 'Finish scenario' })).toBeVisible()
})
