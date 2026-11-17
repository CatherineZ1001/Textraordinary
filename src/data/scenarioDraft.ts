import type { Scenario, ScenarioCategory } from '@/types/scenario'

export const CATEGORIES: readonly ScenarioCategory[] = [
  'professional',
  'friendly',
  'romantic',
  'family',
]

export const LIMITS = {
  title: 200,
  tone: 200,
  context: 2000,
  name: 80,
  text: 1000,
  rounds: 20,
  messages: 20,
  options: 6,
} as const

export interface DraftMessage {
  key: number
  id: string
  sender: 'me' | 'them'
  text: string
  time: string
}

export interface DraftOption {
  key: number
  id: string
  text: string
  reaction: string
}

export interface DraftRound {
  key: number
  messages: DraftMessage[]
  options: DraftOption[]
  correctKey: number | null
}

export interface ScenarioDraft {
  id: string | null
  order: number | null
  title: string
  category: ScenarioCategory | ''
  tone: string
  context: string
  contactName: string
  contactRole: string
  rounds: DraftRound[]
}

let lastKey = 0
const nextKey = () => ++lastKey

export function emptyMessage(sender: 'me' | 'them' = 'them'): DraftMessage {
  return { key: nextKey(), id: '', sender, text: '', time: '' }
}

export function emptyOption(): DraftOption {
  return { key: nextKey(), id: '', text: '', reaction: '' }
}

export function emptyRound(): DraftRound {
  return {
    key: nextKey(),
    messages: [emptyMessage('them')],
    options: [emptyOption(), emptyOption()],
    correctKey: null,
  }
}

export function newDraft(order: number): ScenarioDraft {
  return {
    id: null,
    order,
    title: '',
    category: '',
    tone: '',
    context: '',
    contactName: '',
    contactRole: '',
    rounds: [emptyRound()],
  }
}

export function toDraft(s: Scenario): ScenarioDraft {
  return {
    id: s.id,
    order: s.order ?? null,
    title: s.title ?? '',
    category: s.category ?? '',
    tone: s.tone ?? '',
    context: s.context ?? '',
    contactName: s.contact?.name ?? '',
    contactRole: s.contact?.role ?? '',
    rounds: (s.rounds ?? []).map((r) => {
      const options = (r.options ?? []).map((o) => ({
        key: nextKey(),
        id: o.id,
        text: o.text ?? '',
        reaction: o.reaction ?? '',
      }))
      return {
        key: nextKey(),
        messages: (r.messages ?? []).map((m) => ({
          key: nextKey(),
          id: m.id,
          sender: m.sender,
          text: m.text ?? '',
          time: m.time ?? '',
        })),
        options,
        correctKey: options.find((o) => o.id === r.correctOptionId)?.key ?? null,
      }
    }),
  }
}

const TIME = /^\d{1,2}:\d{2} [AP]M$/
const blank = (v: string) => v.trim() === ''

export function validateDraft(d: ScenarioDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  const need = (path: string, value: string, label: string, max: number) => {
    if (blank(value)) errors[path] = `${label} is required.`
    else if (value.trim().length > max)
      errors[path] = `${label} must be ${max} characters or fewer.`
  }

  need('title', d.title, 'Title', LIMITS.title)
  if (!d.category) errors.category = 'Choose a category.'
  need('tone', d.tone, 'Tone', LIMITS.tone)
  need('context', d.context, 'Context', LIMITS.context)
  need('contactName', d.contactName, 'Contact name', LIMITS.name)
  if (d.contactRole.trim().length > LIMITS.name) {
    errors.contactRole = `Contact role must be ${LIMITS.name} characters or fewer.`
  }
  if (d.order === null || !Number.isInteger(d.order) || d.order < 0) {
    errors.order = 'Order must be a whole number, 0 or more.'
  }

  if (!d.rounds.length) errors.rounds = 'Add at least one round.'
  d.rounds.forEach((r, ri) => {
    const at = `rounds.${ri}`
    if (!r.messages.length) errors[`${at}.messages`] = 'Add at least one message.'
    else if (r.messages.at(-1)!.sender !== 'them') {
      errors[`${at}.messages`] =
        `The last message must be from the contact, so there's something to reply to.`
    }
    r.messages.forEach((m, mi) => {
      need(`${at}.messages.${mi}.text`, m.text, 'Message text', LIMITS.text)
      if (!blank(m.time) && !TIME.test(m.time.trim())) {
        errors[`${at}.messages.${mi}.time`] = 'Time must look like "10:42 AM".'
      }
    })

    if (r.options.length < 2) errors[`${at}.options`] = 'Add at least two suggested replies.'
    r.options.forEach((o, oi) => {
      need(`${at}.options.${oi}.text`, o.text, 'Reply text', LIMITS.text)
      need(`${at}.options.${oi}.reaction`, o.reaction, `The contact's reaction`, LIMITS.text)
    })
    if (!r.options.some((o) => o.key === r.correctKey)) {
      errors[`${at}.correct`] = 'Mark which suggested reply is the best one.'
    }
  })
  return errors
}

const LETTERS = 'abcdefghijklmnopqrstuvwxyz'

export function toScenario(d: ScenarioDraft): Omit<Scenario, 'id'> {
  const usedMessageIds = new Set(
    d.rounds.flatMap((r) => r.messages.map((m) => m.id)).filter(Boolean),
  )
  let n = 1
  const newMessageId = () => {
    while (usedMessageIds.has(`m${n}`)) n++
    usedMessageIds.add(`m${n}`)
    return `m${n}`
  }
  const seenMessageIds = new Set<string>()

  return {
    order: d.order!,
    title: d.title.trim(),
    category: d.category as ScenarioCategory,
    tone: d.tone.trim(),
    context: d.context.trim(),
    contact: d.contactRole.trim()
      ? { name: d.contactName.trim(), role: d.contactRole.trim() }
      : { name: d.contactName.trim() },
    rounds: d.rounds.map((r) => {
      const usedOptionIds = new Set(r.options.map((o) => o.id).filter(Boolean))
      const seenOptionIds = new Set<string>()
      const options = r.options.map((o) => {
        let id = o.id
        if (!id || seenOptionIds.has(id)) {
          id = [...LETTERS].find((l) => !usedOptionIds.has(l)) ?? `o${usedOptionIds.size + 1}`
          usedOptionIds.add(id)
        }
        seenOptionIds.add(id)
        return { key: o.key, value: { id, text: o.text.trim(), reaction: o.reaction.trim() } }
      })
      return {
        messages: r.messages.map((m) => {
          const id = !m.id || seenMessageIds.has(m.id) ? newMessageId() : m.id
          seenMessageIds.add(id)
          return m.time.trim()
            ? { id, sender: m.sender, text: m.text.trim(), time: m.time.trim() }
            : { id, sender: m.sender, text: m.text.trim() }
        }),
        options: options.map((o) => o.value),
        correctOptionId: options.find((o) => o.key === r.correctKey)!.value.id,
      }
    }),
  }
}

export function nextScenarioId(existing: readonly string[]): string {
  const highest = existing.reduce((max, id) => {
    const m = /^sc-(\d+)$/.exec(id)
    return m ? Math.max(max, Number(m[1])) : max
  }, 0)
  return `sc-${String(highest + 1).padStart(3, '0')}`
}

export function matchesSearch(s: Scenario, search: string): boolean {
  const words = search.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const haystack = [s.id, s.title, s.category, s.tone, s.context, s.contact?.name, s.contact?.role]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
  return words.every((w) => haystack.includes(w))
}
