import { expect, type Page } from '@playwright/test'

export const PROJECT_ID = 'demo-textraordinary'

/** TC-UA-01 test data; global-setup creates this account in the Auth emulator. */
export const TEST_USER = {
  email: 'testuser01@example.com',
  password: 'Pass123!',
  displayName: 'Test User',
}

/** The scenario in e2e/fixtures/scenarios.json */
export const SCENARIO = {
  id: 'sc-900',
  contact: 'Jordan',
  options: {
    B: "Sam is out sick, so we're behind. Could we move the deadline to Tuesday? I'll send what's done by Friday.",
    D: 'Can we talk later? Kind of busy right now.',
  },
}

export async function signIn(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(TEST_USER.email)
  await page.getByLabel('Password').fill(TEST_USER.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
}

/** Opens the test scenario in the given mode and plays its messages, ready for a reply. */
export async function openScenario(page: Page, mode: 'Pick a reply' | 'Write your own') {
  await page.goto(`/practice/${SCENARIO.id}`)
  await page.getByRole('radio', { name: mode }).click()
  await page.getByRole('button', { name: 'Wake the phone' }).click()
  await page.getByRole('button', { name: `Open message from ${SCENARIO.contact}` }).click()
}

/** What the mocked coach returns: the JSON the prompt in src/ai/evaluateReply.ts asks the model for. */
export interface CoachGrade {
  score: number
  verdict: string
  toneMatch: 'on-target' | 'close' | 'off'
  strengths: string[]
  improvements: string[]
  suggestedRewrite: string
  likelyReaction: string
  bestOptionLetter?: string
  bestOptionWhy?: string
}

/**
 * Replaces the NaviGator AI with a fixed answer, so tests use no API credit and always get the
 * same grade. Set `response` to 'down' to make the service fail (HTTP 503).
 * `requests` collects the request bodies the app sent.
 */
export async function mockCoach(page: Page, response: CoachGrade | 'down') {
  const coach = { response, requests: [] as string[] }
  await page.route('**/api/navigator/chat/completions', (route) => {
    coach.requests.push(route.request().postData() ?? '')
    if (coach.response === 'down') {
      return route.fulfill({ status: 503, json: { error: { message: 'Service unavailable' } } })
    }
    return route.fulfill({
      json: {
        id: 'chatcmpl-test',
        object: 'chat.completion',
        created: 0,
        model: 'mock',
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: JSON.stringify(coach.response) },
            finish_reason: 'stop',
          },
        ],
      },
    })
  })
  return coach
}
