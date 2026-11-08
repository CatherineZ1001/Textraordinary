<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import PracticeView from './PracticeView.vue'
import ScenarioSummary from '@/components/conversation/ScenarioSummary.vue'
import StreakStat from '@/components/daily/StreakStat.vue'
import { useAuth } from '@/auth/useAuth'
import { getDailyChallenge, getDailyOverview } from '@/data/daily'
import { getScenario } from '@/data/scenarios'
import { formatDateKey, isDateKey, localDateKey, msUntilNextDay } from '@/data/dates'
import type { Streak } from '@/data/streaks'
import type { DailyResult } from '@/types/daily'
import type { Scenario } from '@/types/scenario'

// Daily challenge page.
// /daily        today's challenge (PBI 14). Played once (PBI 15): after that it shows the saved result.
// /daily/:date  replays a past day's challenge (PBI 22); nothing is saved, so scores and streaks
//               stay as they were. The router sends today's date to /daily instead.
// At midnight the page moves on to the new day. A challenge started but not finished by then is
// missed (PBI 19): the page says so instead of letting it be finished late.
const props = defineProps<{ date?: string }>()
const { user } = useAuth()

const today = ref(localDateKey())
const date = computed(() => props.date ?? today.value)
const official = computed(() => date.value === today.value)

const loadState = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref('')
const scenario = ref<Scenario | null>(null)
/** Today's official result, once the member has finished it */
const result = ref<DailyResult | null>(null)
const streak = ref<Streak | null>(null)
/** Whether the member has started today's challenge */
const started = ref(false)
/** The date of a challenge the day ran out on, while the "Time's up" panel shows */
const missed = ref<string | null>(null)

let loadId = 0

async function load() {
  const current = ++loadId
  loadState.value = 'loading'
  try {
    const uid = user.value?.uid
    if (!uid) throw new Error('Not signed in')
    if (!isDateKey(date.value) || date.value > today.value) {
      return fail(current, "There's no daily challenge for that date.")
    }

    if (official.value) {
      const overview = await getDailyOverview(uid, today.value)
      if (current !== loadId) return
      scenario.value = overview.scenario
      result.value = overview.result
      started.value = overview.started
      streak.value = overview.streak
    } else {
      const challenge = await getDailyChallenge(date.value)
      if (current !== loadId) return
      scenario.value = await getScenario(challenge.scenarioId)
      result.value = null
    }
    if (current !== loadId) return
    if (!scenario.value) {
      return fail(current, "This challenge's scenario has been removed.")
    }
    loadState.value = 'ready'
  } catch (err) {
    if (current !== loadId) return
    console.error('Loading the daily challenge failed:', err)
    fail(current, "Couldn't load the daily challenge. Check your connection and try again.")
  }
}

function fail(current: number, message: string) {
  if (current !== loadId) return
  loadError.value = message
  loadState.value = 'error'
}

/** Today's challenge is done: show the saved result instead of the phone */
const showResult = computed(() => official.value && result.value !== null)

const resultRounds = computed(() =>
  (result.value?.rounds ?? []).map((r) =>
    r.score === null ? null : { score: r.score, verdict: r.verdict ?? '' },
  ),
)

watch(date, load, { immediate: true })

/** The day ran out on today's challenge: show "Time's up" and load the new day behind it */
function expire() {
  if (official.value && !result.value) missed.value = date.value
  started.value = false
  today.value = localDateKey() // changes `date`, which loads the new day's challenge
}

let midnightTimer: ReturnType<typeof setTimeout> | undefined

function waitForMidnight() {
  clearTimeout(midnightTimer)
  midnightTimer = setTimeout(onNewDay, msUntilNextDay() + 500)
}

function onNewDay() {
  if (localDateKey() !== today.value) {
    if (started.value) expire()
    else today.value = localDateKey()
  }
  waitForMidnight()
}

/** The practice page finished the challenge after its day was over */
function onExpired() {
  expire()
  waitForMidnight()
}

waitForMidnight()
onBeforeUnmount(() => clearTimeout(midnightTimer))
</script>

<template>
  <PracticeView
    v-if="loadState === 'ready' && scenario && !showResult && !missed"
    :id="scenario.id"
    :key="date"
    :daily="{ date, official }"
    @started="started = true"
    @expired="onExpired"
  />

  <main v-else class="daily">
    <div class="panel">
      <!-- The day ended before the member finished its challenge -->
      <div v-if="missed" class="status missed" role="alert">
        <p class="eyebrow">Daily challenge · {{ formatDateKey(missed) }}</p>
        <h1>Time's up</h1>
        <p class="lede">
          The day ended before you finished, so this challenge counts as missed. Today's challenge
          is ready.
        </p>
        <button type="button" class="btn" @click="missed = null">Play today's challenge</button>
        <p><RouterLink :to="{ name: 'daily-archive' }">Past challenges</RouterLink></p>
      </div>

      <p v-else-if="loadState === 'loading'" class="status">
        <span class="spinner"></span> Loading the daily challenge…
      </p>

      <div v-else-if="loadState === 'error'" class="status">
        <p class="alert alert-error">{{ loadError }}</p>
        <button type="button" class="btn" @click="load">Try again</button>
        <p><RouterLink :to="{ name: 'daily-archive' }">Past challenges</RouterLink></p>
      </div>

      <!-- Today's challenge, already completed -->
      <div v-else-if="result && scenario" class="done">
        <header class="head">
          <p class="eyebrow">Daily challenge · {{ formatDateKey(date) }}</p>
          <h1>You're done for today</h1>
          <p class="lede">
            You played <strong>{{ scenario.title }}</strong
            >. Each day's challenge counts once, so this is your result for today. A new one is
            ready tomorrow.
          </p>
          <StreakStat v-if="streak" :streak="streak" class="streak" />
          <nav class="links" aria-label="Daily challenge">
            <RouterLink :to="{ name: 'daily-archive' }">Past challenges</RouterLink>
            <RouterLink :to="{ name: 'scenarios' }">Practice other scenarios</RouterLink>
          </nav>
        </header>

        <ScenarioSummary
          :results="resultRounds"
          :restartable="false"
          eyebrow="Today's result"
          class="summary"
        />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* Same frame as the practice page: powder blue around one white panel */
.daily {
  min-height: calc(100dvh - var(--nav-height));
  padding: 0 12px 12px;
  background: var(--powder);
}
.panel {
  min-height: calc(100dvh - var(--nav-height) - 12px);
  padding: 40px 36px 36px;
  border-radius: var(--radius-lg);
  background: var(--white);
  color: var(--navy);
}
.status {
  max-width: 420px;
  margin: 48px auto;
  text-align: center;
  color: var(--ink-soft);
}

.done {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  gap: 56px;
  max-width: 1100px;
  margin: 0 auto;
}
.eyebrow {
  margin: 0;
  color: var(--ink-soft);
}
h1 {
  margin: 12px 0 0;
  font-size: clamp(44px, 6vw, 84px);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.045em;
}
.lede {
  max-width: 46ch;
  margin: 20px 0 0;
  font-size: 17px;
  line-height: 1.5;
  color: var(--ink-soft);
}
.lede strong {
  color: var(--navy);
  font-weight: 600;
}
.streak {
  margin-top: 32px;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 24px;
  margin-top: 28px;
  font-weight: 500;
}

.missed {
  max-width: 520px;
}
.missed h1 {
  color: var(--navy);
}
.missed .lede {
  margin: 20px auto 28px;
}

@media (max-width: 860px) {
  .panel {
    min-height: 0;
    padding: 24px 18px;
  }
  .done {
    grid-template-columns: 1fr;
    gap: 32px;
  }
}
</style>
