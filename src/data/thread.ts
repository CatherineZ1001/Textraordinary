import type { Scenario, ScenarioMessage, SubmittedReply } from '@/types/scenario'

// Builds the text thread of a multi-round scenario. The phone and the AI coach both use this,
// so they always see the same conversation.

/**
 * The conversation as it stands when the user decides in `round`: every earlier round's messages,
 * the user's reply to it and the contact's reaction, then this round's messages.
 * `replies` holds the user's replies to the earlier rounds, in order.
 * Reactions belong to the suggested options, so a written reply gets none.
 */
export function threadBefore(
  scenario: Scenario,
  round: number,
  replies: SubmittedReply[],
): ScenarioMessage[] {
  const rounds = scenario.rounds ?? []
  const thread: ScenarioMessage[] = []
  rounds.slice(0, round).forEach((r, i) => {
    thread.push(...r.messages)
    const reply = replies[i]
    if (!reply) return
    thread.push({ id: `r${i + 1}-me`, sender: 'me', text: reply.text })
    const reaction =
      reply.mode === 'choose' ? r.options.find((o) => o.id === reply.optionId)?.reaction : undefined
    if (reaction) thread.push({ id: `r${i + 1}-reaction`, sender: 'them', text: reaction })
  })
  thread.push(...(rounds[round]?.messages ?? []))
  return thread
}
