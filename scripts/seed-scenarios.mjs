// Loads scenarios from JSON files into the Firestore "scenarios" collection.
// Usage: node scripts/seed-scenarios.mjs <file.json> [more.json ...] [--dry-run]
//
// Every file must hold a JSON array of scenarios (see src/types/scenario.ts, plus an `order` number).
// All files are checked first; if anything is invalid, nothing is written.
// Writing needs GOOGLE_APPLICATION_CREDENTIALS pointing at a Firebase service account key.
// --dry-run only checks the files and needs no key.
import { readFileSync } from 'node:fs'
import { applicationDefault, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const CATEGORIES = ['professional', 'friendly', 'romantic', 'family']
const FIELDS = [
  'id',
  'order',
  'title',
  'category',
  'tone',
  'context',
  'contact',
  'messages',
  'options',
  'correctOptionId',
]

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const files = args.filter((a) => !a.startsWith('--'))
if (files.length === 0) {
  console.error('Usage: node scripts/seed-scenarios.mjs <file.json> [more.json ...] [--dry-run]')
  process.exit(1)
}

const isText = (v) => typeof v === 'string' && v.trim() !== ''

/** Returns a list of problems with one scenario; empty means it is valid. */
function validate(s) {
  if (typeof s !== 'object' || s === null || Array.isArray(s)) return ['must be an object']
  const errors = []
  const check = (ok, msg) => ok || errors.push(msg)

  const extra = Object.keys(s).filter((k) => !FIELDS.includes(k))
  check(extra.length === 0, `unknown fields: ${extra.join(', ')}`)
  check(/^sc-\d{3,}$/.test(s.id ?? ''), 'id must look like "sc-001"')
  check(Number.isInteger(s.order), 'order must be an integer')
  for (const f of ['title', 'tone', 'context']) check(isText(s[f]), `${f} must be a non-empty string`)
  check(CATEGORIES.includes(s.category), `category must be one of: ${CATEGORIES.join(', ')}`)
  check(isText(s.contact?.name), 'contact.name is required')
  check(s.contact?.role === undefined || isText(s.contact.role), 'contact.role must be a string')

  const messages = Array.isArray(s.messages) ? s.messages : []
  check(messages.length > 0, 'messages must be a non-empty array')
  messages.forEach((m, i) => {
    check(isText(m?.id), `messages[${i}].id is required`)
    check(m?.sender === 'me' || m?.sender === 'them', `messages[${i}].sender must be "me" or "them"`)
    check(isText(m?.text), `messages[${i}].text is required`)
    check(
      m?.time === undefined || /^\d{1,2}:\d{2} [AP]M$/.test(m.time),
      `messages[${i}].time must look like "10:42 AM"`,
    )
  })
  check(messages.at(-1)?.sender === 'them', 'the last message must be from "them"')
  check(new Set(messages.map((m) => m?.id)).size === messages.length, 'message ids must be unique')

  const options = Array.isArray(s.options) ? s.options : []
  check(options.length >= 2, 'options must have at least 2 entries')
  options.forEach((o, i) => {
    check(isText(o?.id), `options[${i}].id is required`)
    check(isText(o?.text), `options[${i}].text is required`)
  })
  check(new Set(options.map((o) => o?.id)).size === options.length, 'option ids must be unique')
  check(options.some((o) => o?.id === s.correctOptionId), 'correctOptionId must match an option id')
  return errors
}

// Read and validate everything first, so a bad file writes nothing
const scenarios = []
let failed = false
for (const file of files) {
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch (err) {
    console.error(`✗ ${file}: ${err.message}`)
    failed = true
    continue
  }
  if (!Array.isArray(data)) {
    console.error(`✗ ${file}: must contain a JSON array of scenarios`)
    failed = true
    continue
  }
  data.forEach((s, i) => {
    const errors = validate(s)
    if (errors.length) {
      failed = true
      console.error(`✗ ${file} [${i}] ${s?.id ?? '(no id)'}:\n    ${errors.join('\n    ')}`)
    }
  })
  scenarios.push(...data)
}

const ids = scenarios.map((s) => s?.id)
const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
if (duplicates.length) {
  console.error(`✗ duplicate ids: ${duplicates.join(', ')}`)
  failed = true
}
if (failed) {
  console.error('\nNothing was written. Fix the errors above and run again.')
  process.exit(1)
}
console.log(`✓ ${scenarios.length} scenarios are valid`)
if (dryRun) process.exit(0)

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('✗ GOOGLE_APPLICATION_CREDENTIALS is not set; point it at your service account key.')
  process.exit(1)
}

// Write in batches (Firestore allows up to 500 writes per batch).
// set() replaces the whole document, so re-running the script updates scenarios in place.
initializeApp({ credential: applicationDefault() })
const db = getFirestore()
for (let i = 0; i < scenarios.length; i += 500) {
  const batch = db.batch()
  for (const { id, ...data } of scenarios.slice(i, i + 500)) {
    batch.set(db.collection('scenarios').doc(id), data)
  }
  await batch.commit()
}
console.log(`✓ wrote ${scenarios.length} scenarios to Firestore`)
