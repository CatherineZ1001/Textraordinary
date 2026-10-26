import { expect, test } from '@playwright/test'
import { mockCoach, openScenario, signIn } from './helpers'

const REPLY = 'Hi Jordan, Sam is out sick. Could we move the deadline to Tuesday?'

test('TC-CR-01: write a custom reply and recover from a failed evaluation', async ({ page }) => {
  // Precondition: the AI evaluation service is unavailable
  const coach = await mockCoach(page, 'down')
  await signIn(page)
  await openScenario(page, 'Write your own')

  // 1) Send is disabled for empty or spaces-only input
  const input = page.getByRole('textbox', { name: 'Your reply' })
  const send = page.getByRole('button', { name: 'Send reply' })
  await expect(input).toHaveValue('')
  await expect(send).toBeDisabled()
  await input.fill('   ')
  await expect(send).toBeDisabled()

  // 2) Type a reply and send it
  await input.fill(REPLY)
  await expect(send).toBeEnabled()
  await send.click()

  // 3) A clear error with a retry button, and the reply is kept
  await expect(
    page.getByRole('heading', { name: "The coach couldn't grade this one" }),
  ).toBeVisible()
  await expect(page.getByText('NaviGator request failed (503)')).toBeVisible()
  const retry = page.getByRole('button', { name: 'Try again' })
  await expect(retry).toBeVisible()
  await expect(page.getByRole('region', { name: 'Conversation' })).toContainText(REPLY)

  // 4) Restore the service and retry
  coach.response = {
    score: 7,
    verdict: 'Honest, with a clear ask',
    toneMatch: 'close',
    strengths: ['Explains why the work is late', 'Proposes a new date'],
    improvements: ["Offer to send what's finished by Friday."],
    suggestedRewrite:
      "Hi Jordan, Sam is out sick so we're behind. Could we move the deadline to Tuesday? I can send what's done by Friday.",
    likelyReaction: 'Jordan would appreciate the heads-up and likely agree.',
  }
  await retry.click()

  await expect(page.getByRole('img', { name: 'Score: 7 out of 10' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Honest, with a clear ask' })).toBeVisible()
  await expect(page.getByText("Offer to send what's finished by Friday.")).toBeVisible()
  const rewrite = page.locator('section', {
    has: page.getByRole('heading', { name: 'A stronger version' }),
  })
  await expect(rewrite).toContainText("I can send what's done by Friday.")
  // The same reply was sent again on retry, and the feedback stays visible
  expect(coach.requests.at(-1)).toContain(REPLY)
  await expect(page.getByRole('button', { name: 'Finish scenario' })).toBeVisible()
})
