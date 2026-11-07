<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { listDailyChallenges, listDailyResults, listDailyStarts } from '@/data/daily'
import { dailyDayStatus } from '@/data/dailyStatus'
import { listScenarios } from '@/data/scenarios'
import { addDays, formatDateKey, localDateKey } from '@/data/dates'
import type { DailyChallenge, DailyResult } from '@/types/daily'
import type { Scenario } from '@/types/scenario'

// Past daily challenges (PBI 22), newest first, with the member's official score for each day.
// Replaying one opens /daily/:date, which saves nothing, so official scores and streaks don't change.
// A day the member started but didn't finish shows as missed (PBI 19), one never started as not played.
const DAYS = 30
const { user } = useAuth()
const today = localDateKey()

const challenges = ref<DailyChallenge[]>([])
const scenarios = ref(new Map<string, Scenario>())
const results = ref(new Map<string, DailyResult>())
const starts = ref(new Set<string>())
const loadState = ref<'loading' | 'ready' | 'error'>('loading')

async function load() {
  const uid = user.value?.uid
  if (!uid) return
  loadState.value = 'loading'
  try {
    const [past, all, mine, started] = await Promise.all([
      listDailyChallenges(addDays(today, -DAYS), addDays(today, -1)),
      listScenarios(),
      listDailyResults(uid),
      listDailyStarts(uid),
    ])
    starts.value = started
    challenges.value = past.reverse()
    scenarios.value = new Map(all.map((s) => [s.id, s]))
    results.value = new Map(mine.map((r) => [r.date, r]))
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading past daily challenges failed:', err)
    loadState.value = 'error'
  }
}

const rows = computed(() =>
  challenges.value.map((c) => {
    const result = results.value.get(c.date) ?? null
    return {
      ...c,
      // the scenario they actually played, in case the schedule changed afterwards
      scenario: scenarios.value.get(result?.scenarioId ?? c.scenarioId) ?? null,
      result,
      status: dailyDayStatus(c.date, today, {
        completed: result !== null,
        started: starts.value.has(c.date),
      }),
    }
  }),
)

onMounted(load)
</script>

<template>
  <main class="archive">
    <div class="panel">
      <header class="intro">
        <h1>Past challenges</h1>
        <p class="lede">
          Replay any earlier daily challenge for practice. Replays don't change your official scores
          or your streak. A challenge you started but didn't finish that day counts as missed.
        </p>
        <RouterLink :to="{ name: 'daily' }" class="today">Today's challenge →</RouterLink>
      </header>

      <section class="list" aria-label="Past daily challenges">
        <p v-if="loadState === 'loading'" class="status">
          <span class="spinner"></span> Loading past challenges…
        </p>
        <div v-else-if="loadState === 'error'" class="status">
          <p class="alert alert-error">
            Couldn't load past challenges. Check your connection and try again.
          </p>
          <button type="button" class="btn" @click="load">Try again</button>
        </div>
        <p v-else-if="rows.length === 0" class="status">
          No past challenges yet. Come back tomorrow to replay today's.
        </p>

        <template v-else>
          <div class="columns" aria-hidden="true">
            <span>Date</span>
            <span>Scenario</span>
            <span>Your score</span>
            <span></span>
          </div>
          <ol class="rows">
            <li v-for="row in rows" :key="row.date" class="row">
              <span class="date">{{ formatDateKey(row.date) }}</span>
              <span class="title">{{ row.scenario?.title ?? 'Scenario removed' }}</span>
              <span class="score" :class="{ missed: !row.result }">
                <template v-if="row.result">{{ row.result.averageScore ?? '—' }}/10</template>
                <template v-else-if="row.status === 'missed'">Missed</template>
                <template v-else>Not played</template>
              </span>
              <RouterLink
                v-if="row.scenario"
                :to="{ name: 'daily-replay', params: { date: row.date } }"
                class="replay"
                :aria-label="`Replay ${formatDateKey(row.date)}: ${row.scenario.title}`"
              >
                Replay
              </RouterLink>
              <span v-else></span>
            </li>
          </ol>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
.archive {
  padding: 0 12px 12px;
  background: var(--powder);
}
.panel {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.4fr);
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
.today {
  display: inline-block;
  margin-top: 20px;
  font-weight: 600;
}

.columns,
.row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr) 100px 80px;
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
  padding: 18px 0;
  border-bottom: 1px solid var(--ink-rule);
}
.date {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.title {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.35;
}
.score {
  font-variant-numeric: tabular-nums;
}
.score.missed {
  color: var(--ink-soft);
}
.replay {
  justify-self: end;
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
  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'date replay'
      'title title'
      'score score';
    gap: 4px 14px;
  }
  .date {
    grid-area: date;
  }
  .title {
    grid-area: title;
  }
  .score {
    grid-area: score;
    font-size: 14px;
  }
  .replay {
    grid-area: replay;
  }
}
</style>
