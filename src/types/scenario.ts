// The shape of one practice scenario.
// PBI 02 (loading scenarios from Firestore) should return objects in this shape,
// or convert Firestore documents into it, so the conversation page works unchanged.

export type ScenarioCategory = 'professional' | 'friendly' | 'romantic' | 'family'

export interface ScenarioMessage {
  id: string
  /** 'them' = the other person (grey, left), 'me' = the user (blue, right) */
  sender: 'me' | 'them'
  text: string
  /** Only the first message's time is shown, as the "Today 10:42 AM" stamp */
  time?: string
}

export interface ScenarioOption {
  id: string
  text: string
  /** The contact's reply when the user sends this option; played before the next round */
  reaction?: string
}

/** One decision in a scenario: messages to read, then a reply to send */
export interface ScenarioRound {
  /** Played before the user replies; the last one is from 'them' */
  messages: ScenarioMessage[]
  /** Suggested replies for "Pick a reply" mode */
  options: ScenarioOption[]
  /** Used for grading (PBI 07); never shown in the UI */
  correctOptionId?: string
}

export interface Scenario {
  id: string
  /** Sort position in scenario lists (lowest first) */
  order?: number
  title: string
  category: ScenarioCategory
  /** The tone the user should aim for, e.g. "Polite and professional" */
  tone: string
  /** Background shown on the sticky note */
  context: string
  /** Who the user is texting; shown in the phone header and notification */
  contact?: { name: string; role?: string }
  /** The conversation, one decision per round; message ids are unique across rounds */
  rounds: ScenarioRound[]
}

/** 'choose' = pick a suggested reply (Epic SR), 'write' = type your own (Epic CR) */
export type PracticeMode = 'choose' | 'write'

/** What the conversation page emits when the user sends a reply */
export interface SubmittedReply {
  mode: PracticeMode
  optionId: string | null
  text: string
}
