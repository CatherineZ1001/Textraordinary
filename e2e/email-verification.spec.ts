import { expect, test } from '@playwright/test'
import { applyVerificationCode, latestVerificationCode } from './helpers'

test('PBI 23: a new account must verify its email before the first sign-in', async ({ page }) => {
  const email = `verify-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const password = 'Pass123!'

  await page.goto('/register')
  await page.getByLabel('Display name').fill('New Member')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByLabel('Confirm password').fill(password)
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible()
  await expect(page.getByRole('status')).toContainText(email)
  await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  const firstCode = await latestVerificationCode(email)
  expect(firstCode).not.toBeNull()

  await page.getByRole('link', { name: 'Go to sign in' }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByRole('alert')).toContainText('Please verify your email before signing in')
  await expect(page).toHaveURL(/\/login/)

  await page.getByRole('button', { name: 'Resend verification email' }).click()
  await expect(page.getByText('A new verification link is on its way.')).toBeVisible()
  const code = await latestVerificationCode(email)
  expect(code).not.toBe(firstCode)

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login\?redirect=/)

  await applyVerificationCode(code!)
  await page.goto('/login?verified=1')
  await expect(page.getByRole('status')).toContainText('Your email is verified')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('link', { name: 'Your profile' })).toHaveText('NM')
})
