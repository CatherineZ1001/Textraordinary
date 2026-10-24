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
/** "01", "02", ... shown large in the right-hand column */
const number = computed(() => String(scenario.value?.order ?? 1).padStart(2, '0'))

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
    <!-- one white panel filling the screen: brief | phone | feedback -->
    <div class="panel">
      <div class="top">
        <RouterLink :to="{ name: 'scenarios' }" class="back">← All scenarios</RouterLink>
        <ModeSwitch v-model="mode" class="mode" />
      </div>
      <p v-if="loadState === 'loading'" class="status">
        <span class="spinner"></span> Loading scenario…
      </p>
      <div v-else-if="loadState === 'error'" class="status">
        <p class="alert alert-error">{{ loadError }}</p>
        <button type="button" class="btn" @click="loadScenario">Try again</button>
        <p><RouterLink :to="{ name: 'scenarios' }">Back to all scenarios</RouterLink></p>
      </div>
      <ConversationPage
        v-else-if="scenario"
        :key="attempt"
        class="body"
        :scenario="scenario"
        :mode="mode"
        :selected-id="selectedId"
        :round="round"
        :history="history"
        sent-placeholder="Read the coach's feedback, then tap Continue"
        @select="(id) => (selectedId = id)"
        @submit="onSubmit"
      >
        <template #feedback>
          <div class="aside">
            <!-- the scenario's number, large, with the round underneath -->
            <div class="aside-head">
              <p class="number">{{ number }}</p>
              <p class="eyebrow">
                {{ finished ? 'Complete' : `Round ${round + 1} of ${roundCount}` }}
              </p>
            </div>

            <Transition name="fade" mode="out-in">
              <ScenarioSummary
                v-if="finished"
                key="summary"
                :results="results"
                @restart="resetRounds"
              />
              <FeedbackCard
                v-else-if="evalState !== 'idle'"
                key="feedback"
                :state="evalState"
                :evaluation="evaluation"
                :error="evalError"
                :contact-name="scenario.contact?.name ?? 'They'"
                :tone="scenario.tone"
                :last="round === roundCount - 1"
                @retry="retry"
                @continue="continueRound"
              />
              <div v-else key="idle" class="idle">
                <svg class="mark" viewBox="-5 -3 110 106" aria-hidden="true">
                  <path
                    d="M50 4 C76 4 96 22 96 46 C96 70 76 88 50 88 C44 88 38 87 33 85 L12 96 L17 77 C9 69 4 58 4 46 C4 22 24 4 50 4 Z M50 18 C69 18 82 30 82 46 C82 62 69 74 50 74 C31 74 18 62 18 46 C18 30 31 18 50 18 Z"
                    fill-rule="evenodd"
                  />
                  <path d="M31 30 H69 V41 H55.5 V64 H44.5 V41 H31 Z" />
                </svg>
                <p class="hint">
                  {{
                    mode === 'choose'
                      ? 'Pick a reply on the phone and send it.'
                      : 'Write your reply on the phone and send it.'
                  }}
                  The coach's feedback will appear here.
                </p>
              </div>
            </Transition>
          </div>
        </template>
      </ConversationPage>
    </div>
  </main>
</template>

<style scoped>
/* Fits the window below the nav bar on wide screens, so nothing needs page scrolling */
.practice {
  height: calc(100dvh - var(--nav-height));
  padding: 0 12px 12px;
  /* powder blue continues from the nav bar around the white panel */
  background: var(--powder);
}
.panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 18px 32px 28px;
  border-radius: var(--radius-lg);
  background: var(--white);
  color: var(--navy);
}
.top {
  /* the back link sits on the left while the mode switch stays centered */
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 12px;
}
.back {
  justify-self: start;
  color: var(--ink-soft);
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
}
.back:hover {
  color: var(--navy);
}
/* a wide switch, so it reads as the main control above the phone */
.mode {
  width: min(420px, 56vw);
}
.body {
  flex: 1;
  min-height: 0;
}
.status {
  max-width: 420px;
  margin: 48px auto;
  text-align: center;
  color: var(--ink-soft);
}

/* ---- Right column ------------------------------------------------------- */
.aside {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}
.aside-head {
  text-align: right;
  margin-bottom: 16px;
}
.number {
  margin: 0;
  font-size: clamp(56px, 9vh, 104px);
  line-height: 0.9;
  font-weight: 400;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}
.aside-head .eyebrow {
  margin: 8px 0 0;
}
/* before the first reply: the logo in icy blue, and where the feedback will go */
.idle {
  margin-top: auto;
}
.idle .mark {
  display: block;
  width: 132px;
  fill: var(--powder);
}
.idle .hint {
  margin: 18px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--ink-rule);
  max-width: 34ch;
  font-size: 15px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s, transform 0.25s;
}
.fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.fade-leave-to {
  opacity: 0;
}

/* Small screens: everything stacks and the page scrolls */
@media (max-width: 860px) {
  .practice {
    height: auto;
  }
  .panel {
    height: auto;
    padding: 16px 16px 24px;
  }
  .aside {
    min-height: 0;
  }
  .aside-head {
    text-align: left;
  }
  .idle {
    margin-top: 0;
  }
  .idle .mark {
    display: none;
  }
}
</style>
