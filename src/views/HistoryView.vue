<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { HISTORY_LIMIT, listAttempts } from '@/data/attempts'
import { averageScore } from '@/data/daily'
import { addDays, formatDateKey, localDateKey } from '@/data/dates'
import type { Attempt, AttemptMode } from '@/types/attempt'

// Practice history (PBI 17): the member's saved attempts (PBI 10), newest first, with the date,
// scenario, mode and score, filtered by date. Each attempt opens to show its replies and grades.
const { user } = useAuth()
const today = localDateKey()

type Preset = '7' | '30' | 'all' | 'custom'
const presets: { value: Preset; label: string }[] = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
]
const preset = ref<Preset>('all')
const customFrom = ref(addDays(today, -6))
const customTo = ref(today)

/** The days to show, both included; null means no limit on that side */
const range = computed<{ from: string | null; to: string | null }>(() => {
  switch (preset.value) {
    case '7':
      return { from: addDays(today, -6), to: today }
    case '30':
      return { from: addDays(today, -29), to: today }
    case 'custom':
      return { from: customFrom.value || null, to: customTo.value || null }
    default:
      return { from: null, to: null }
  }
})
const rangeError = computed(() =>
  range.value.from && range.value.to && range.value.from > range.value.to
    ? 'The start date is after the end date.'
    : '',
)

const attempts = ref<Attempt[]>([])
const loadState = ref<'loading' | 'ready' | 'error'>('loading')
let loadId = 0

async function load() {
  const uid = user.value?.uid
  if (!uid || rangeError.value) return
  const current = ++loadId
  loadState.value = 'loading'
  try {
    const found = await listAttempts(uid, range.value)
    if (current !== loadId) return
    attempts.value = found
    loadState.value = 'ready'
  } catch (err) {
    if (current !== loadId) return
    console.error('Loading your practice history failed:', err)
    loadState.value = 'error'
  }
}
watch(range, load, { immediate: true })

const modeLabels: Record<AttemptMode, string> = {
  choose: 'Pick a reply',
  write: 'Write your own',
  mixed: 'Mixed',
}
const sourceLabels = { practice: '', daily: 'Daily challenge', replay: 'Daily replay' } as const

function when(attempt: Attempt) {
  const date = attempt.startedAt?.toDate() ?? new Date()
  return {
    day: formatDateKey(localDateKey(date)),
    time: date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
    iso: date.toISOString(),
  }
}

/** Totals for the attempts shown: how many, and the average of their scores */
const totals = computed(() => {
  const scored = attempts.value.map((a) => ({ score: a.averageScore }))
  return { count: attempts.value.length, average: averageScore(scored) }
})

const rangeLabel = computed(() => {
  const { from, to } = range.value
  if (!from && !to) return 'All time'
  const f = from ? formatDateKey(from) : 'the start'
  const t = to ? formatDateKey(to) : 'today'
  return from === to && from ? f : `${f} – ${t}`
})
</script>

<template>
  <main class="history">
    <div class="panel">
      <header class="intro">
        <h1>Practice history</h1>
        <p class="lede">
          Every scenario you've played, with your mode and score. Open one to see your replies and
          the coach's feedback.
        </p>

        <fieldset class="filter">
          <legend class="eyebrow">Dates</legend>
          <div class="presets" role="radiogroup" aria-label="Dates">
            <button
              v-for="p in presets"
              :key="p.value"
              type="button"
              role="radio"
              :aria-checked="preset === p.value"
              :class="{ on: preset === p.value }"
              @click="preset = p.value"
            >
              {{ p.label }}
            </button>
          </div>
          <div v-if="preset === 'custom'" class="custom">
            <label>
              From
              <input v-model="customFrom" type="date" :max="today" />
            </label>
            <label>
              To
              <input v-model="customTo" type="date" :max="today" />
            </label>
          </div>
          <p v-if="rangeError" class="alert alert-error" role="alert">{{ rangeError }}</p>
        </fieldset>

        <dl v-if="loadState === 'ready' && totals.count" class="totals">
          <div>
            <dt class="eyebrow">Attempts</dt>
            <dd data-testid="history-count">{{ totals.count }}</dd>
          </div>
          <div>
            <dt class="eyebrow">Average score</dt>
            <dd data-testid="history-average">
              {{ totals.average ?? '—' }}<span class="unit">/10</span>
            </dd>
          </div>
        </dl>
      </header>

      <section class="list" :aria-label="`Attempts: ${rangeLabel}`">
        <p v-if="loadState === 'loading'" class="status">
          <span class="spinner"></span> Loading your history…
        </p>
        <div v-else-if="loadState === 'error'" class="status">
          <p class="alert alert-error">
            Couldn't load your history. Check your connection and try again.
          </p>
          <button type="button" class="btn" @click="load">Try again</button>
        </div>
        <div v-else-if="attempts.length === 0" class="status">
          <p v-if="range.from || range.to">No attempts between these dates.</p>
          <template v-else>
            <p>You haven't played any scenarios yet.</p>
            <RouterLink :to="{ name: 'scenarios' }">Pick a scenario to practice →</RouterLink>
          </template>
        </div>

        <template v-else>
          <div class="columns" aria-hidden="true">
            <span>Date</span>
            <span>Scenario</span>
            <span>Mode</span>
            <span>Score</span>
          </div>
          <ol class="rows">
            <li v-for="a in attempts" :key="a.id" class="row" data-testid="history-row">
              <details>
                <summary class="line">
                  <span class="date">
                    <time :datetime="when(a).iso">{{ when(a).day }}</time>
                    <span class="time">{{ when(a).time }}</span>
                  </span>
                  <span class="title">
                    {{ a.scenarioTitle }}
                    <span class="tags">
                      <span class="tag">{{ a.category }}</span>
                      <span v-if="sourceLabels[a.source]" class="tag tag-daily">
                        {{ sourceLabels[a.source] }}
                      </span>
                    </span>
                  </span>
                  <span class="mode">{{ modeLabels[a.mode] }}</span>
                  <span class="score">
                    <span :class="{ muted: a.averageScore === null }"
                      >{{ a.averageScore ?? '—' }}/10</span
                    >
                    <span v-if="a.status === 'in-progress'" class="unfinished">
                      Unfinished · {{ a.rounds.length }} of {{ a.roundCount }} rounds
                    </span>
                  </span>
                </summary>

                <ol class="rounds">
                  <li v-for="(r, i) in a.rounds" :key="i">
                    <p class="eyebrow">
                      Round {{ i + 1 }} · {{ r.score === null ? 'Not graded' : `${r.score}/10` }}
                      <template v-if="r.verdict"> · {{ r.verdict }}</template>
                    </p>
                    <blockquote>{{ r.text }}</blockquote>
                    <p v-if="r.improvements.length" class="note">
                      <strong>Try next time:</strong> {{ r.improvements.join(' ') }}
                    </p>
                  </li>
                </ol>
                <RouterLink :to="{ name: 'practice', params: { id: a.scenarioId } }" class="again">
                  Practice this scenario again →
                </RouterLink>
              </details>
            </li>
          </ol>
          <p v-if="attempts.length >= HISTORY_LIMIT" class="status">
            Showing your {{ HISTORY_LIMIT }} most recent attempts in this range. Narrow the dates to
            see older ones.
          </p>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* Same frame as the daily archive: powder blue around one white panel */
.history {
  padding: 0 12px 12px;
  background: var(--powder);
}
.panel {
  display: grid;
  grid-template-columns: minmax(0, 0.75fr) minmax(0, 1.5fr);
  gap: 48px;
  min-height: calc(100dvh - var(--nav-height) - 12px);
  padding: 40px 36px 36px;
  border-radius: var(--radius-lg);
  background: var(--white);
  color: var(--navy);
}

.intro {
  align-self: start;
  position: sticky;
  top: 96px;
}
h1 {
  margin: 0;
  font-size: clamp(48px, 6.5vw, 96px);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.045em;
}
.lede {
  max-width: 34ch;
  margin: 18px 0 0;
  font-size: 17px;
  color: var(--ink-soft);
}

.filter {
  margin: 28px 0 0;
  padding: 0;
  border: 0;
}
.filter legend {
  margin-bottom: 10px;
  color: var(--ink-soft);
}
.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.presets button {
  padding: 7px 14px;
  border: 1px solid var(--line);
  border-radius: var(--radius-pill);
  background: var(--white);
  color: var(--navy);
  font: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}
.presets button:hover {
  border-color: var(--navy);
}
.presets button.on {
  border-color: var(--navy);
  background: var(--navy);
  color: var(--white);
}
.presets button:focus-visible {
  outline: 2px solid var(--slate);
  outline-offset: 2px;
}
.custom {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 14px;
}
.custom label {
  display: grid;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-soft);
}
.custom input {
  padding: 7px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  font: inherit;
  color: var(--navy);
}
.filter .alert {
  margin-top: 12px;
}

.totals {
  display: flex;
  gap: 36px;
  margin: 32px 0 0;
}
.totals dt {
  color: var(--ink-soft);
}
.totals dd {
  margin: 4px 0 0;
  font-size: 40px;
  line-height: 1;
  letter-spacing: -0.03em;
  font-variant-numeric: tabular-nums;
}
.totals .unit {
  font-size: 18px;
  color: var(--ink-soft);
}

.columns,
.line {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr) 120px 110px;
  gap: 20px;
  align-items: baseline;
}
.columns {
  padding: 4px 0 12px;
  border-bottom: 1px solid var(--ink-rule);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-soft);
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.row {
  border-bottom: 1px solid var(--ink-rule);
}
.line {
  padding: 18px 0;
  cursor: pointer;
  list-style: none;
}
.line::-webkit-details-marker {
  display: none;
}
.line:hover .title {
  text-decoration: underline;
  text-underline-offset: 3px;
}
.line:focus-visible {
  outline: 2px solid var(--slate);
  outline-offset: 2px;
}
.date {
  display: grid;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.time {
  font-size: 13px;
  font-weight: 400;
  color: var(--ink-soft);
}
.title {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.35;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
}
.tag {
  padding: 2px 9px;
  border-radius: var(--radius-pill);
  background: var(--powder-soft);
  font-size: 12px;
  font-weight: 600;
  text-transform: capitalize;
}
.tag-daily {
  background: var(--lime);
  text-transform: none;
}
.mode {
  font-size: 15px;
  color: var(--ink-soft);
}
.score {
  display: grid;
  gap: 2px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.score .muted {
  color: var(--ink-soft);
}
.unfinished {
  font-size: 12px;
  font-weight: 500;
  color: var(--warn);
}

.rounds {
  list-style: none;
  margin: 0 0 4px;
  padding: 0 0 0 140px;
}
.rounds li {
  padding: 4px 0 14px;
}
.rounds .eyebrow {
  margin: 0;
  color: var(--ink-soft);
}
blockquote {
  margin: 6px 0 0;
  padding-left: 12px;
  border-left: 3px solid var(--powder);
  font-size: 15px;
  line-height: 1.5;
}
.note {
  margin: 6px 0 0;
  font-size: 14px;
  color: var(--ink-soft);
}
.again {
  display: inline-block;
  margin: 0 0 18px 140px;
  font-weight: 600;
}

.status {
  padding: 24px 0;
  color: var(--ink-soft);
}
.status .alert {
  max-width: 420px;
}

@media (max-width: 900px) {
  .panel {
    grid-template-columns: 1fr;
    gap: 28px;
    min-height: 0;
    padding: 28px 20px 24px;
  }
  .intro {
    position: static;
  }
  .columns {
    display: none;
  }
  .line {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'date score'
      'title title'
      'mode mode';
    gap: 4px 14px;
  }
  .date {
    grid-area: date;
  }
  .title {
    grid-area: title;
  }
  .mode {
    grid-area: mode;
    font-size: 14px;
  }
  .score {
    grid-area: score;
    text-align: right;
  }
  .rounds,
  .again {
    padding-left: 0;
    margin-left: 0;
  }
}
</style>
