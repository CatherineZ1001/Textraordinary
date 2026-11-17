import { expect, test } from '@playwright/test'
import { createUser, makeAdmin, readDocFields, SCENARIO, signIn, writeDoc } from './helpers'

test('PBI 12: an admin adds, finds, edits and deletes a scenario', async ({ page }) => {
  const admin = await createUser('scenario-admin')
  await signIn(page, admin)
  await makeAdmin(admin.uid)
  await page.goto('/admin/scenarios')

  const tag = Date.now().toString(36)
  const title = `Cancelling plans ${tag}`
  const renamed = `Rescheduling with Riley ${tag}`
  const library = page.getByRole('region', { name: 'Scenarios' })
  const listed = (text: string) => library.getByText(text, { exact: true })
  await expect(library.getByText(SCENARIO.title)).toBeVisible()

  await library.getByRole('button', { name: 'Add scenario' }).click()
  await library.getByRole('button', { name: 'Save scenario' }).click()
  await expect(library.getByRole('alert')).toContainText('need attention')
  await expect(library.getByText('Title is required.')).toBeVisible()
  await expect(library.getByText('Choose a category.')).toBeVisible()
  await expect(library.getByText('Contact name is required.')).toBeVisible()
  await expect(library.getByText('Mark which suggested reply is the best one.')).toBeVisible()
  await expect(library.getByLabel('Title')).toBeFocused()

  await library.getByLabel('Title').fill(title)
  await library.getByLabel('Category').selectOption('friendly')
  await library.getByLabel('Tone to aim for').fill('Warm and honest')
  await library
    .getByLabel('Context')
    .fill("You promised to help Riley move on Saturday, but you're sick.")
  await library.getByLabel('Contact name').fill('Riley')
  await library.getByLabel('Round 1, message 1 text').fill('Still good for Saturday?')
  await library
    .getByLabel('Round 1, reply A text')
    .fill("I'm so sorry, I'm sick. Can I help Sunday?")
  await library.getByLabel('Round 1, reply A reaction').fill('Oh no, feel better! Sunday works.')
  await library.getByLabel('Round 1, reply B text').fill("can't make it")
  await library.getByLabel('Round 1, reply B reaction').fill('...okay?')
  await library.getByLabel('Round 1, reply A is the best reply').check()
  await library.getByRole('button', { name: 'Save scenario' }).click()

  await expect(library.getByRole('status')).toContainText(`Added “${title}”`)
  const id = (await library.getByRole('status').textContent())!.match(/\((sc-\d+)\)/)![1]!
  const saved = await readDocFields(`scenarios/${id}`)
  expect(saved?.title).toEqual({ stringValue: title })

  const search = library.getByLabel('Search scenarios')
  await search.fill(tag)
  await expect(library.getByText(/^1 of \d+ scenarios match$/)).toBeVisible()
  await expect(listed(title)).toBeVisible()
  await expect(library.getByText(SCENARIO.title)).toHaveCount(0)
  await search.fill('nothing matches this')
  await expect(library.getByText('No scenarios match your search.')).toBeVisible()
  await search.fill('')
  await library.getByLabel('Filter by category').selectOption('professional')
  await expect(library.getByText(SCENARIO.title)).toBeVisible()
  await expect(listed(title)).toHaveCount(0)
  await library.getByLabel('Filter by category').selectOption('')

  await library.getByRole('button', { name: `Edit ${title}` }).click()
  await library.getByLabel('Tone to aim for').fill('')
  await library.getByRole('button', { name: 'Save changes' }).click()
  await expect(library.getByText('Tone is required.')).toBeVisible()
  await library.getByLabel('Tone to aim for').fill('Kind and clear')
  await library.getByLabel('Title').fill(renamed)
  await library.getByRole('button', { name: 'Save changes' }).click()
  await expect(library.getByRole('status')).toContainText(`Saved changes to “${renamed}”`)
  expect((await readDocFields(`scenarios/${id}`))?.tone).toEqual({ stringValue: 'Kind and clear' })

  const member = await createUser('scenario-member')
  expect(
    await writeDoc(`scenarios/${id}`, { title: { stringValue: 'Hacked' } }, member.idToken),
  ).toBe(403)

  await library.getByRole('button', { name: `Delete ${renamed}` }).click()
  const confirm = library.getByRole('group', {
    name: `Confirm deleting ${renamed}`,
  })
  await confirm.getByRole('button', { name: 'Keep it' }).click()
  await expect(confirm).toHaveCount(0)
  expect(await readDocFields(`scenarios/${id}`)).not.toBeNull()

  await library.getByRole('button', { name: `Delete ${renamed}` }).click()
  await confirm.getByRole('button', { name: 'Delete scenario' }).click()
  await expect(library.getByRole('status')).toContainText(`Deleted “${renamed}”`)
  await expect(listed(renamed)).toHaveCount(0)
  expect(await readDocFields(`scenarios/${id}`)).toBeNull()
})
