import { expect, test } from '@playwright/test'
import {
  createUser,
  deleteDoc,
  makeAdmin,
  readCollection,
  readDocFields,
  SCENARIO,
  signIn,
  writeDoc,
} from './helpers'

// TC-UA-03 test data. The category is "friendly": the app has no "social" category.
const TITLE = 'Declining a party invite'
const TONE = 'Friendly but firm'
const REPLIES = [
  ["Thanks for asking! I can't make it Saturday, but have a great time.", 'No worries, next time!'],
  ['Maybe, I will see how I feel.', 'So is that a yes or a no?'],
  ['Parties are not really my thing, sorry.', 'Oh, okay then.'],
  ['ugh no', 'Wow, okay.'],
] as const

test('TC-UA-03: only admins can manage scenarios, and required fields are validated', async ({
  page,
}) => {
  // Start clean, even if an earlier failed run left this scenario behind
  const leftovers = (await readCollection<{ title?: string }>('scenarios')).docs
  for (const s of leftovers.filter((s) => s.title === TITLE)) await deleteDoc(`scenarios/${s.id}`)
  const originalIds = (await readCollection('scenarios')).docs.map((s) => s.id).sort()

  // 1) A member is kept out of scenario management
  const member = await createUser('scenario-member')
  await signIn(page, member)
  await expect(page.getByRole('link', { name: 'Admin' })).toHaveCount(0)
  await page.goto('/admin/scenarios')
  await expect(page).toHaveURL(/\/practice$/)
  await expect(page.getByRole('button', { name: 'Add scenario' })).toHaveCount(0)
  // ...and the database refuses their writes too
  expect(
    await writeDoc(
      `scenarios/${SCENARIO.id}`,
      { title: { stringValue: 'Hacked' } },
      member.idToken,
    ),
  ).toBe(403)

  // 2) Sign out, then sign in as an admin
  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
  const admin = await createUser('scenario-admin')
  await makeAdmin(admin.uid)
  await signIn(page, admin)
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Admin' }).click()
  await expect(page).toHaveURL(/\/admin\/scenarios$/)
  const library = page.getByRole('region', { name: 'Scenarios' })
  const listed = (text: string) => library.getByText(text, { exact: true })
  await expect(library.getByText(SCENARIO.title)).toBeVisible()

  // 3) Every field but the title is filled in: saving shows the error and writes nothing
  await library.getByRole('button', { name: 'Add scenario' }).click()
  await library.getByLabel('Category').selectOption('friendly')
  await library.getByLabel('Tone to aim for').fill(TONE)
  await library
    .getByLabel('Context')
    .fill("Your coworker Alex invited you to a party on Saturday, but you'd rather not go.")
  await library.getByLabel('Contact name').fill('Alex')
  await library.getByLabel('Round 1, message 1 text').fill('Party at my place Saturday, you in?')
  await library.getByRole('button', { name: 'Add reply' }).click()
  await library.getByRole('button', { name: 'Add reply' }).click()
  for (const [i, [text, reaction]] of REPLIES.entries()) {
    const letter = 'ABCD'[i]
    await library.getByLabel(`Round 1, reply ${letter} text`).fill(text)
    await library.getByLabel(`Round 1, reply ${letter} reaction`).fill(reaction)
  }
  await library.getByLabel('Round 1, reply A is the best reply').check()
  await library.getByRole('button', { name: 'Save scenario' }).click()
  await expect(library.getByRole('alert')).toContainText('1 field needs attention')
  await expect(library.getByText('Title is required.')).toBeVisible()
  await expect(library.getByLabel('Title')).toBeFocused()
  expect((await readCollection('scenarios')).docs.map((s) => s.id).sort()).toEqual(originalIds)

  // 4) With the title filled in, it saves
  await library.getByLabel('Title').fill(TITLE)
  await library.getByRole('button', { name: 'Save scenario' }).click()
  await expect(library.getByRole('status')).toContainText(`Added “${TITLE}”`)
  const id = (await library.getByRole('status').textContent())!.match(/\((sc-\d+)\)/)![1]!
  const saved = await readDocFields(`scenarios/${id}`)
  expect(saved?.title).toEqual({ stringValue: TITLE })
  expect(saved?.tone).toEqual({ stringValue: TONE })
  expect(saved?.category).toEqual({ stringValue: 'friendly' })

  // 5) Find it by search, change its tone, then delete it
  const search = library.getByLabel('Search scenarios')
  await search.fill('party invite')
  await expect(library.getByText(/^1 of \d+ scenarios match$/)).toBeVisible()
  await expect(listed(TITLE)).toBeVisible()
  await expect(library.getByText(SCENARIO.title)).toHaveCount(0)
  await search.fill('nothing matches this')
  await expect(library.getByText('No scenarios match your search.')).toBeVisible()
  await search.fill('')
  await library.getByLabel('Filter by category').selectOption('professional')
  await expect(library.getByText(SCENARIO.title)).toBeVisible()
  await expect(listed(TITLE)).toHaveCount(0)
  await library.getByLabel('Filter by category').selectOption('')

  await library.getByRole('button', { name: `Edit ${TITLE}` }).click()
  await library.getByLabel('Tone to aim for').fill('')
  await library.getByRole('button', { name: 'Save changes' }).click()
  await expect(library.getByText('Tone is required.')).toBeVisible()
  await library.getByLabel('Tone to aim for').fill('Warm and clear')
  await library.getByRole('button', { name: 'Save changes' }).click()
  await expect(library.getByRole('status')).toContainText(`Saved changes to “${TITLE}”`)
  expect((await readDocFields(`scenarios/${id}`))?.tone).toEqual({ stringValue: 'Warm and clear' })

  await library.getByRole('button', { name: `Delete ${TITLE}` }).click()
  const confirm = library.getByRole('group', { name: `Confirm deleting ${TITLE}` })
  await confirm.getByRole('button', { name: 'Keep it' }).click()
  await expect(confirm).toHaveCount(0)
  expect(await readDocFields(`scenarios/${id}`)).not.toBeNull()

  await library.getByRole('button', { name: `Delete ${TITLE}` }).click()
  await confirm.getByRole('button', { name: 'Delete scenario' }).click()
  await expect(library.getByRole('status')).toContainText(`Deleted “${TITLE}”`)
  await expect(listed(TITLE)).toHaveCount(0)

  // Postcondition: the scenario list is back to how it started
  expect((await readCollection('scenarios')).docs.map((s) => s.id).sort()).toEqual(originalIds)
})
