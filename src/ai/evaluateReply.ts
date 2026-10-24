import type { Scenario, ScenarioOption, ScenarioRound, SubmittedReply } from '@/types/scenario'
import { threadBefore } from '@/data/thread'
import { chatJson, NavigatorError } from './navigator'

// Asks the AI coach to grade the reply the user just sent in a scenario.

export type ToneMatch = 'on-target' | 'close' | 'off'

export interface ReplyEvaluation {
  /** 1-10 */
  score: number
  /** One-line headline, e.g. "Honest and solution-focused" */
  verdict: string
  toneMatch: ToneMatch
  strengths: string[]
  improvements: string[]
  /** A better version of the user's text */
  suggestedRewrite: string
  /** How the other person would probably feel or respond */
  likelyReaction: string
  /** Only for picked replies: which suggested reply was best, and why */
  bestOption?: BestOption
}

export interface BestOption {
  /** "A", "B", ... in the order the options are shown */
  letter: string
  text: string
  why: string
  /** True when the user picked this option */
  picked: boolean
}

const SYSTEM_PROMPT = `You are a warm but honest texting coach in an app where people practice sending text messages.
Grade the user's final text in the conversation. Earlier texts from "You" were graded separately; use them only as context. Judge it on:
- how well it matches the tone they were asked to aim for
- clarity: is it obvious what they mean or need?
- honesty and ownership of the situation
- whether it suits the relationship with the other person and moves the conversation forward

Respond with ONLY a JSON object in exactly this shape:
{
  "score": integer 1-10 (10 = ideal text for this situation),
  "verdict": string, a short headline of at most 6 words,
  "toneMatch": "on-target" | "close" | "off",
  "strengths": array of 1-3 strings, each under 20 words,
  "improvements": array of 0-3 strings, each under 20 words,
  "suggestedRewrite": string, a stronger version of the user's text written as a natural text message,
  "likelyReaction": string, one sentence on how the other person would probably feel or reply
}
Be specific to this conversation. Speak to the user as "you". If the text is already excellent, keep improvements empty and make suggestedRewrite a light polish.`

// Added when the user picked from suggested replies, so the coach grades the choice
// against the options they actually had.
const OPTIONS_PROMPT = `
The user chose their text from a list of suggested replies. Grade the CHOICE, comparing it with the other options.
Add two more fields to the JSON:
  "bestOptionLetter": the letter of the best option,
  "bestOptionWhy": 1-2 sentences on why that option is the best choice compared with the others
If an answer key is given, the best option is the one it names.
If the user picked the best option:
- score 9 or 10; do not criticize them for flaws that every option shares
- "improvements" must be an empty array and "suggestedRewrite" must be ""
- in "strengths", explain what makes their pick better than the alternatives
If the user picked a different option, explain in "improvements" what the best option does that theirs does not.`

const letterOf = (index: number) => String.fromCharCode(65 + index) // 0 -> "A"

/** The round's suggested replies, when the user picked one of them. */
function pickedFrom(current: ScenarioRound | undefined, reply: SubmittedReply): ScenarioOption[] {
  return reply.mode === 'choose' && reply.optionId ? (current?.options ?? []) : []
}

function optionsSection(current: ScenarioRound | undefined, reply: SubmittedReply): string {
  const options = pickedFrom(current, reply)
  if (!options.length) return ''
  const list = options.map((o, i) => `${letterOf(i)}) ${o.text}`).join('\n')
  const picked = options.findIndex((o) => o.id === reply.optionId)
  const key = options.findIndex((o) => o.id === current?.correctOptionId)
  const answerKey = key >= 0 ? `\nAnswer key: the best option is ${letterOf(key)}.` : ''
  return `

Suggested replies the user could choose from:
${list}

The user picked: ${letterOf(picked)}${answerKey}`
}

function buildPrompt(
  scenario: Scenario,
  round: number,
  history: SubmittedReply[],
  reply: SubmittedReply,
): string {
  const name = scenario.contact?.name ?? 'Them'
  const who = scenario.contact?.role ? `${name} (${scenario.contact.role})` : name
  const transcript = threadBefore(scenario, round, history)
    .map((m) => `${m.sender === 'them' ? name : 'You'}: ${m.text}`)
    .join('\n')

  return `Scenario: ${scenario.title}
Category: ${scenario.category}
Tone to aim for: ${scenario.tone}
Situation: ${scenario.context}
Texting with: ${who}
Round ${round + 1} of ${scenario.rounds.length}

Conversation so far:
${transcript}

The user's reply to grade (${reply.mode === 'choose' ? 'picked from suggested replies' : 'written themselves'}):
You: ${reply.text}${optionsSection(scenario.rounds[round], reply)}`
}

const strings = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.filter((s): s is string => typeof s === 'string' && s.trim() !== '').slice(0, max)
    : []

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Works out the best option, trusting the scenario's answer key over the model when there is one. */
function bestOption(
  r: Record<string, unknown>,
  current: ScenarioRound | undefined,
  reply: SubmittedReply,
): BestOption | undefined {
  const options = pickedFrom(current, reply)
  let index = options.findIndex((o) => o.id === current?.correctOptionId)
  if (index < 0) {
    const letter = text(r.bestOptionLetter).toUpperCase().replace(/[^A-Z]/g, '')
    index = letter.length === 1 ? letter.charCodeAt(0) - 65 : -1
  }
  const option = options[index]
  if (!option) return undefined
  return {
    letter: letterOf(index),
    text: option.text,
    why: text(r.bestOptionWhy),
    picked: option.id === reply.optionId,
  }
}

/** Turns whatever the model returned into a safe ReplyEvaluation, or throws if it is unusable. */
function normalize(
  raw: unknown,
  current: ScenarioRound | undefined,
  reply: SubmittedReply,
): ReplyEvaluation {
  const r = (raw ?? {}) as Record<string, unknown>
  const score = Math.round(Number(r.score))
  const verdict = text(r.verdict)
  if (!Number.isFinite(score) || !verdict) {
    throw new NavigatorError('The coach returned an incomplete evaluation.')
  }
  const toneMatch: ToneMatch =
    r.toneMatch === 'on-target' || r.toneMatch === 'close' || r.toneMatch === 'off'
      ? r.toneMatch
      : 'close'
  const evaluation: ReplyEvaluation = {
    score: Math.min(10, Math.max(1, score)),
    verdict,
    toneMatch,
    strengths: strings(r.strengths, 3),
    improvements: strings(r.improvements, 3),
    suggestedRewrite: text(r.suggestedRewrite),
    likelyReaction: text(r.likelyReaction),
    bestOption: bestOption(r, current, reply),
  }
  // Picking the best option available is the right answer; don't mark it down
  if (evaluation.bestOption?.picked) {
    evaluation.score = Math.max(evaluation.score, 9)
    evaluation.toneMatch = 'on-target'
    evaluation.improvements = []
    evaluation.suggestedRewrite = ''
  }
  return evaluation
}

/**
 * Grades the reply sent in `round`. `history` holds the user's replies to the earlier rounds,
 * so the coach sees the whole conversation so far.
 */
export async function evaluateReply(
  scenario: Scenario,
  round: number,
  history: SubmittedReply[],
  reply: SubmittedReply,
  signal?: AbortSignal,
): Promise<ReplyEvaluation> {
  const current = scenario.rounds[round]
  const raw = await chatJson<unknown>(
    [
      {
        role: 'system',
        content: pickedFrom(current, reply).length ? SYSTEM_PROMPT + OPTIONS_PROMPT : SYSTEM_PROMPT,
      },
      { role: 'user', content: buildPrompt(scenario, round, history, reply) },
    ],
    { temperature: 0.3, signal },
  )
  return normalize(raw, current, reply)
}
