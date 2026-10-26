import { expect, test } from '@playwright/test'
import { signIn } from './helpers'

test('TC-UA-01: a registered user can sign in', async ({ page }) => {
  await signIn(page)

  await expect(page).toHaveURL(/\/dashboard$/)
  const nav = page.getByRole('navigation', { name: 'Main' })
  await expect(nav.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(nav.getByRole('link', { name: 'Profile' })).toBeVisible()
  // Initials of the display name "Test User"
  await expect(page.getByRole('link', { name: 'Your profile' })).toHaveText('TU')
})
