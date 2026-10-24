<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { listScenarios } from '@/data/scenarios'
import type { Scenario } from '@/types/scenario'

// Scenario list (/practice). One lime panel: a large "Scenarios" title on the left and a
// numbered list on the right, rows separated by hairlines. Each row opens /practice/:id.
const scenarios = ref<Scenario[]>([])
const loadState = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref('')

async function load() {
  loadState.value = 'loading'
  try {
    scenarios.value = await listScenarios()
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading scenarios failed:', err)
    loadError.value =
      err instanceof FirebaseError && err.code === 'permission-denied'
        ? 'Please sign in to see the scenarios.'
        : "Couldn't load the scenarios. Check your connection and try again."
    loadState.value = 'error'
  }
}

/** "001", "002", ... from the scenario's order (or its position) */
const number = (s: Scenario, i: number) => String(s.order ?? i + 1).padStart(3, '0')

onMounted(load)
</script>

<template>
  <main class="scenarios">
    <div class="panel">
      <header class="intro">
        <h1>Scenarios</h1>
        <p v-if="loadState === 'ready' && scenarios.length" class="count">
          {{ scenarios.length }} conversations to practice
        </p>
        <!-- the logo, large, in the corner (decorative) -->
        <svg class="mark" viewBox="-5 -3 110 106" aria-hidden="true">
          <path
            d="M50 4 C76 4 96 22 96 46 C96 70 76 88 50 88 C44 88 38 87 33 85 L12 96 L17 77 C9 69 4 58 4 46 C4 22 24 4 50 4 Z M50 18 C69 18 82 30 82 46 C82 62 69 74 50 74 C31 74 18 62 18 46 C18 30 31 18 50 18 Z"
            fill-rule="evenodd"
          />
          <path d="M31 30 H69 V41 H55.5 V64 H44.5 V41 H31 Z" />
        </svg>
      </header>

      <section class="list" aria-label="Scenarios">
        <p v-if="loadState === 'loading'" class="status">
          <span class="spinner"></span> Loading scenarios…
        </p>
        <div v-else-if="loadState === 'error'" class="status">
          <p class="alert alert-error">{{ loadError }}</p>
          <button type="button" class="btn" @click="load">Try again</button>
        </div>
        <p v-else-if="scenarios.length === 0" class="status">No scenarios yet.</p>

        <template v-else>
          <div class="columns" aria-hidden="true">
            <span></span>
            <span>Scenario</span>
            <span>Aim for</span>
            <span class="right">Category</span>
          </div>
          <ol class="rows">
            <li v-for="(s, i) in scenarios" :key="s.id">
              <RouterLink :to="{ name: 'practice', params: { id: s.id } }" class="row">
                <span class="num">{{ number(s, i) }}</span>
                <span class="title">{{ s.title }}</span>
                <span class="aim">{{ s.tone }}</span>
                <span class="category">{{ s.category }}</span>
              </RouterLink>
            </li>
          </ol>
        </template>
      </section>
    </div>
  </main>
</template>

<style scoped>
/* white around the lime panel, continuing from the plain white nav bar */
.scenarios {
  padding: 0 12px 12px;
  background: var(--white);
}
/* one calm lime surface; everything on it is navy at different strengths */
.panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 48px;
  min-height: calc(100dvh - var(--nav-height) - 12px);
  padding: 40px 36px 36px;
  border-radius: var(--radius-lg);
  background: var(--lime);
  color: var(--navy);
}

/* ---- Left: the big title, with the logo pinned to the bottom ------------ */
.intro {
  position: sticky;
  top: 96px;
  align-self: start;
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 170px);
}
h1 {
  margin: 0;
  font-size: clamp(56px, 8vw, 112px);
  line-height: 0.95;
  font-weight: 400;
  letter-spacing: -0.045em;
}
.count {
  margin: 18px 0 0;
  font-size: 17px;
  color: var(--ink-soft);
}
.mark {
  width: 120px;
  margin-top: auto;
  fill: var(--navy);
}

/* ---- Right: the numbered list -------------------------------------------- */
.columns,
.row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1.4fr) minmax(0, 1fr) 110px;
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
.right {
  text-align: right;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
}
.rows li {
  border-bottom: 1px solid var(--ink-rule);
}
.row {
  padding: 18px 0;
  color: var(--navy);
  text-decoration: none;
  transition: padding 0.2s;
}
.num {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.title {
  font-size: 17px;
  font-weight: 500;
  line-height: 1.35;
}
.aim {
  font-size: 15px;
  color: var(--ink-soft);
}
.category {
  text-align: right;
  font-size: 15px;
  text-transform: capitalize;
}
/* hover: the row nudges right and the title gets an underline */
.row:hover {
  padding-left: 8px;
}
.row:hover .title {
  text-decoration: underline;
  text-underline-offset: 4px;
  text-decoration-thickness: 1.5px;
}

.status {
  padding: 24px 0;
  color: var(--ink-soft);
}
.status .alert {
  max-width: 420px;
}

/* ---- Narrow screens: title on top, rows stack their details ------------- */
@media (max-width: 900px) {
  .panel {
    grid-template-columns: 1fr;
    gap: 28px;
    min-height: 0;
    padding: 28px 20px 24px;
  }
  .intro {
    position: static;
    min-height: 0;
  }
  .mark {
    display: none;
  }
  .columns {
    display: none;
  }
  .row {
    grid-template-columns: 48px minmax(0, 1fr) auto;
    grid-template-areas:
      'num title category'
      'num aim aim';
    gap: 4px 14px;
  }
  .num { grid-area: num; }
  .title { grid-area: title; }
  .aim { grid-area: aim; font-size: 14px; }
  .category { grid-area: category; font-size: 14px; }
}
</style>
