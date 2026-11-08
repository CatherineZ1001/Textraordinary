<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import StreakStat from './StreakStat.vue'
import { useAuth } from '@/auth/useAuth'
import { getDailyOverview, type DailyOverview } from '@/data/daily'
import { formatDateKey, localDateKey } from '@/data/dates'

// The dashboard's entry point to today's daily challenge (PBI 14): the scenario, whether the
// member has done it (with their score) or started it, their streak, and a link to past challenges.
const { user } = useAuth()

const today = localDateKey()
const overview = ref<DailyOverview | null>(null)
const loadState = ref<'loading' | 'ready' | 'error'>('loading')

async function load() {
  const uid = user.value?.uid
  if (!uid) return
  loadState.value = 'loading'
  try {
    overview.value = await getDailyOverview(uid, today)
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading the daily challenge failed:', err)
    loadState.value = 'error'
  }
}

onMounted(load)
</script>

<template>
  <section class="daily-card" aria-labelledby="daily-card-title">
    <p class="eyebrow">Daily challenge · {{ formatDateKey(today) }}</p>

    <p v-if="loadState === 'loading'" class="status">
      <span class="spinner"></span> Loading today's challenge…
    </p>
    <div v-else-if="loadState === 'error'" class="status">
      <p class="alert alert-error">Couldn't load today's challenge.</p>
      <button type="button" class="btn" @click="load">Try again</button>
    </div>

    <template v-else-if="overview">
      <div class="body">
        <div class="about">
          <h2 id="daily-card-title">{{ overview.scenario?.title ?? "Today's challenge" }}</h2>
          <p v-if="overview.scenario" class="meta">
            <span class="tag">{{ overview.scenario.category }}</span>
            Aim for: {{ overview.scenario.tone }}
          </p>

          <p v-if="overview.result" class="done">
            Done for today ·
            <strong>{{ overview.result.averageScore ?? '—' }}/10</strong>
          </p>
          <p v-else-if="overview.started" class="done">
            Started · finish it before midnight or it counts as missed
          </p>
          <RouterLink :to="{ name: 'daily' }" class="btn play">
            {{ overview.result ? 'See your result' : "Play today's challenge" }}
            <span aria-hidden="true">→</span>
          </RouterLink>
        </div>

        <StreakStat :streak="overview.streak" class="streak" />
      </div>

      <RouterLink :to="{ name: 'daily-archive' }" class="archive">Past challenges</RouterLink>
    </template>
  </section>
</template>

<style scoped>
.daily-card {
  padding: 28px 30px 26px;
  border-radius: var(--radius-lg);
  background: var(--navy);
  color: var(--white);
}
.eyebrow {
  margin: 0;
  color: var(--lime);
}
.status {
  margin: 16px 0 0;
  color: rgba(255, 255, 255, 0.8);
}

.body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 32px;
  align-items: end;
  margin-top: 14px;
}
h2 {
  margin: 0;
  font-size: clamp(26px, 3.4vw, 36px);
  line-height: 1.1;
  font-weight: 500;
  letter-spacing: -0.03em;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin: 12px 0 0;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.8);
}
.done {
  margin: 18px 0 0;
  font-size: 16px;
}
.done strong {
  color: var(--lime);
}

/* lime on navy, the reverse of the usual button */
.daily-card .play {
  margin-top: 20px;
  background: var(--lime);
  color: var(--navy);
  text-decoration: none;
}
.daily-card .play:hover {
  background: var(--lime-deep);
}

/* the streak, re-inked for the navy card */
.streak {
  min-width: 190px;
  --ink-soft: rgba(255, 255, 255, 0.75);
}
.streak :deep(.hint) {
  max-width: 24ch;
}

.daily-card .archive {
  display: inline-block;
  margin-top: 22px;
  color: var(--white);
  font-weight: 500;
  text-decoration-color: rgba(255, 255, 255, 0.4);
}

@media (max-width: 640px) {
  .daily-card {
    padding: 22px 20px;
  }
  .body {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}
</style>
