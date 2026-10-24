<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import ConversationPage from '@/components/conversation/ConversationPage.vue'
import ModeSwitch from '@/components/conversation/ModeSwitch.vue'
import FeedbackCard from '@/components/conversation/FeedbackCard.vue'
import ScenarioSummary from '@/components/conversation/ScenarioSummary.vue'
import { getScenario } from '@/data/scenarios'
import { evaluateReply, type ReplyEvaluation } from '@/ai/evaluateReply'
import { isAbort, NavigatorError } from '@/ai/navigator'
import type { PracticeMode, Scenario, SubmittedReply } from '@/types/scenario'

// Practice page (/practice/:id). Loads the scenario from Firestore and shows it on the conversation page.
// - PBI 05 will handle tracking the selected reply properly.
// A scenario has one or more rounds. When a reply is sent, the AI coach grades it and the feedback
// card appears under the note; its Continue button moves on to the next round. After the last
// round, a summary card shows every round's grade.
const props = defineProps<{ id: string }>()

const scenario = ref<Scenario | null>(null)
const loadState = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref('')

function loadErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError && err.code === 'permission-denied') {
    return 'Please sign in to practice.'
  }
  return "Couldn't load the scenario. Check your connection and try again."
}

let loadId = 0 // bumping this ignores any load still in progress

async function loadScenario() {
  const current = ++loadId
  loadState.value = 'loading'
  try {
    const found = await getScenario(props.id)
    if (current !== loadId) return
    if (!found) {
      loadError.value = 'This scenario was not found.'
      loadState.value = 'error'
      return
    }
    if (!found.rounds?.length) {
      loadError.value = 'This scenario is in an old format. Re-seed it with the multi-round format.'
      loadState.value = 'error'
      return
    }
    scenario.value = found
    loadState.value = 'ready'
  } catch (err) {
    if (current !== loadId) return
    console.error('Loading the scenario failed:', err)
    loadError.value = loadErrorMessage(err)
    loadState.value = 'error'
  }
}

const mode = ref<PracticeMode>('choose')
const selectedId = ref<string | null>(null)

const evalState = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const evaluation = ref<ReplyEvaluation | null>(null)
const evalError = ref('')
let lastReply: SubmittedReply | null = null
let controller: AbortController | null = null

// Rounds: `history` and `results` hold the reply and grade (null if skipped) for each finished round
const round = ref(0)
const history = ref<SubmittedReply[]>([])
const results = ref<(ReplyEvaluation | null)[]>([])
const attempt = ref(0) // remounts the conversation page for "Practice again"
const roundCount = computed(() => scenario.value?.rounds.length ?? 0)
const finished = computed(() => roundCount.value > 0 && round.value >= roundCount.value)

function errorMessage(err: unknown): string {
  if (err instanceof NavigatorError && err.status === 401) {
    return 'No NaviGator API key was found. Set the NAVIGATOR_API_KEY environment variable and restart the dev server.'
  }
  if (err instanceof NavigatorError && err.status === 429) {
    return "You've hit the NaviGator usage limit. Wait a bit and try again."
  }
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

async function grade(reply: SubmittedReply) {
  if (!scenario.value) return
  controller?.abort()
  const current = (controller = new AbortController())
  lastReply = reply
  evaluation.value = null
  evalState.value = 'loading'
  try {
    evaluation.value = await evaluateReply(
      scenario.value,
      round.value,
      history.value,
      reply,
      current.signal,
    )
    evalState.value = 'done'
  } catch (err) {
    if (isAbort(err)) return
    console.error('Reply evaluation failed:', err)
    evalError.value = errorMessage(err)
    evalState.value = 'error'
  }
}

function onSubmit(reply: SubmittedReply) {
  void grade(reply)
}

function retry() {
  if (lastReply) void grade(lastReply)
}

// Continue: keep this round's reply and grade, then play the reaction and the next round
function continueRound() {
  if (!lastReply) return
  controller?.abort()
  history.value = [...history.value, lastReply]
  results.value = [...results.value, evalState.value === 'done' ? evaluation.value : null]
  lastReply = null
  evalState.value = 'idle'
  selectedId.value = null
  round.value++
}

function resetRounds() {
  controller?.abort()
  lastReply = null
  evalState.value = 'idle'
  selectedId.value = null
  round.value = 0
  history.value = []
  results.value = []
  attempt.value++
}

// Switching modes clears the current round's sent reply, so clear its feedback too
watch(mode, () => {
  controller?.abort()
  evalState.value = 'idle'
})
// Opening another scenario starts fresh
watch(
  () => props.id,
  () => {
    resetRounds()
    void loadScenario()
  },
  { immediate: true },
)
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="practice">
    <div class="top">
      <RouterLink :to="{ name: 'scenarios' }" class="back">‹ All scenarios</RouterLink>
      <ModeSwitch v-model="mode" />
    </div>
    <p v-if="loadState === 'loading'" class="status">Loading scenario…</p>
    <div v-else-if="loadState === 'error'" class="status">
      <p class="alert alert-error">{{ loadError }}</p>
      <button type="button" class="btn btn-secondary" @click="loadScenario">Try again</button>
      <p><RouterLink :to="{ name: 'scenarios' }">Back to all scenarios</RouterLink></p>
    </div>
    <ConversationPage
      v-else-if="scenario"
      :key="attempt"
      :scenario="scenario"
      :mode="mode"
      :selected-id="selectedId"
      :round="round"
      :history="history"
      sent-placeholder="Read the coach's feedback, then tap Continue"
      @select="(id) => (selectedId = id)"
      @submit="onSubmit"
    >
      <template v-if="finished || evalState !== 'idle'" #feedback>
        <ScenarioSummary v-if="finished" :results="results" @restart="resetRounds" />
        <FeedbackCard
          v-else-if="evalState !== 'idle'"
          :state="evalState"
          :evaluation="evaluation"
          :error="evalError"
          :contact-name="scenario.contact?.name ?? 'They'"
          :tone="scenario.tone"
          :last="round === roundCount - 1"
          @retry="retry"
          @continue="continueRound"
        />
      </template>
    </ConversationPage>
  </main>
</template>

<style scoped>
.top {
  /* the back link sits on the left while the mode switch stays centered */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 24px 16px 0;
}
.back {
  justify-self: start;
  color: var(--desk-ink);
  font-weight: 500;
}
.status {
  max-width: 420px;
  margin: 48px auto;
  text-align: center;
}
</style>
