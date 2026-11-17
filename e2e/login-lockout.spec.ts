import { expect, test } from '@playwright/test'
import { createUser } from './helpers'

test('PBI 21: repeated wrong passwords pause sign-in for a while', async ({ page }) => {
  const user = await createUser('lockout')
  await page.clock.install()
  await page.goto('/login')
  await page.getByLabel('Email').fill(user.email)

  const signIn = page.getByRole('button', { name: 'Sign in' })
  const tryPassword = async (password: string) => {
    await page.getByLabel('Password').fill(password)
    await signIn.click()
  }

  for (let i = 1; i <= 3; i++) {
    await tryPassword(`wrong-${i}`)
    await expect(page.getByRole('alert')).toContainText('Incorrect email or password.')
  }
  await expect(page.getByRole('alert')).toContainText('2 attempts left')
  await tryPassword('wrong-4')
  await expect(page.getByRole('alert')).toContainText('1 attempt left')

  await tryPassword('wrong-5')
  const lockout = page.getByRole('alert')
  await expect(lockout).toContainText('Too many failed sign-in attempts')
  await expect(lockout).toContainText(/Try again in 1[45]:\d\d/)
  await expect(signIn).toBeDisabled()

  await page.reload()
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await expect(signIn).toBeDisabled()

  await page.getByLabel('Email').fill('someone-else@example.com')
  await expect(signIn).toBeEnabled()

  await page.getByLabel('Email').fill(user.email)
  await page.clock.fastForward('15:01')
  await expect(signIn).toBeEnabled()
  await signIn.click()
  await expect(page).toHaveURL(/\/dashboard$/)
})
