<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ReplyEvaluation } from '@/ai/evaluateReply'

// Shown under the scenario note once the last round is done: each round's grade and the average.
// A round whose feedback was skipped (the coach failed) has a null result and shows "—".
const props = defineProps<{ results: (ReplyEvaluation | null)[] }>()
const emit = defineEmits<{ restart: [] }>()

const scored = computed(() => props.results.filter((r): r is ReplyEvaluation => r !== null))
const average = computed(() =>
  scored.value.length
    ? Math.round((scored.value.reduce((sum, r) => sum + r.score, 0) / scored.value.length) * 10) / 10
    : null,
)

// Same ink as the feedback card's stamp: green for strong, amber for okay, red to rethink
const ink = (score: number) => (score >= 8 ? 'good' : score >= 5 ? 'okay' : 'poor')
</script>

<template>
  <article class="card" aria-live="polite">
    <p class="hand label">Coach's summary</p>
    <h2>Scenario complete</h2>
    <p v-if="average !== null" class="average">
      Average score: <strong :class="ink(average)">{{ average }}</strong> / 10
    </p>

    <ol class="rounds">
      <li v-for="(result, i) in results" :key="i">
        <span class="round">Round {{ i + 1 }}</span>
        <template v-if="result">
          <span class="score" :class="ink(result.score)">{{ result.score }}</span>
          <span class="verdict">{{ result.verdict }}</span>
        </template>
        <template v-else>
          <span class="score skipped">—</span>
          <span class="verdict muted">Feedback skipped</span>
        </template>
      </li>
    </ol>

    <div class="actions">
      <button type="button" class="again" @click="emit('restart')">Practice again</button>
      <RouterLink :to="{ name: 'scenarios' }" class="all">All scenarios</RouterLink>
    </div>
  </article>
</template>

<style scoped>
/* the same index card as the coach's feedback */
.card {
  --rule: rgba(0, 122, 255, 0.11);
  --margin: rgba(230, 70, 70, 0.4);
  --pen-red: #c8352e;
  --pen-green: #1f8a4c;
  --pen-amber: #b7700a;

  position: relative;
  padding: 26px 26px 24px 46px;
  border-radius: 3px;
  background:
    linear-gradient(90deg, transparent 30px, var(--margin) 30px, var(--margin) 31.5px, transparent 31.5px),
    repeating-linear-gradient(transparent 0 27px, var(--rule) 27px 28px),
    #fffefb;
  background-position: 0 0, 0 18px, 0 0;
  box-shadow: 0 1px 0 rgba(23, 32, 42, 0.08), 0 14px 30px -18px rgba(23, 32, 42, 0.45);
  transform: rotate(0.8deg);
}
.hand {
  font-family: var(--font-hand);
}
.label {
  margin: 0;
  font-size: 22px;
  color: var(--pen-red);
}
h2 {
  margin: 2px 0 6px;
  font-size: 24px;
}
.average {
  margin: 0 0 14px;
}
.rounds {
  list-style: none;
  margin: 0;
  padding: 0;
}
.rounds li {
  display: grid;
  grid-template-columns: auto auto 1fr;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}
.round {
  font-size: 14px;
  color: var(--desk-ink);
}
.score {
  min-width: 32px;
  text-align: center;
  font-weight: 700;
  font-size: 18px;
  border: 2px solid currentColor;
  border-radius: 999px;
}
.good { color: var(--pen-green); }
.okay { color: var(--pen-amber); }
.poor { color: var(--pen-red); }
.skipped { color: var(--desk-ink); }
.muted { color: var(--desk-ink); }
.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-top: 20px;
}
.again {
  padding: 10px 18px;
  font: inherit;
  font-weight: 600;
  color: #fff;
  background: var(--ios-blue);
  border: 0;
  border-radius: 12px;
  cursor: pointer;
}
.all {
  font-weight: 500;
  color: var(--desk-ink);
}
</style>
