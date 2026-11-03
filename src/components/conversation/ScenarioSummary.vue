<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import type { ReplyEvaluation } from '@/ai/evaluateReply'
import { averageScore } from '@/data/daily'

// Shown in the practice page's right-hand column once the last round is done, directly on the
// panel: the average score as a big stat, then one row per round (score, verdict).
// A round whose feedback was skipped (the coach failed) has a null result and shows "—".
// The default slot goes above the buttons, e.g. whether a daily challenge result was saved.
// `restartable: false` hides "Practice again" (an official daily challenge counts once).
const props = withDefaults(
  defineProps<{
    results: (Pick<ReplyEvaluation, 'score' | 'verdict'> | null)[]
    restartable?: boolean
    eyebrow?: string
  }>(),
  { restartable: true, eyebrow: 'Scenario complete' },
)
const emit = defineEmits<{ restart: [] }>()

const average = computed(() => averageScore(props.results))
</script>

<template>
  <article class="card" aria-live="polite">
    <p class="eyebrow">{{ eyebrow }}</p>

    <p class="average">
      <span class="num">{{ average ?? '—' }}</span><span class="unit">/10</span>
    </p>
    <p class="eyebrow caption">Average score</p>

    <ol class="rounds">
      <li v-for="(result, i) in results" :key="i">
        <span class="score">{{ result ? result.score : '—' }}</span>
        <span class="detail">
          <span class="eyebrow">Round {{ i + 1 }}</span>
          <span class="verdict">{{ result ? result.verdict : 'Feedback skipped' }}</span>
        </span>
      </li>
    </ol>

    <slot />

    <div class="actions">
      <button v-if="restartable" type="button" class="again" @click="emit('restart')">
        Practice again <span aria-hidden="true">↻</span>
      </button>
      <RouterLink :to="{ name: 'scenarios' }" class="all">All scenarios</RouterLink>
    </div>
  </article>
</template>

<style scoped>
/* No box: same as the feedback it replaces, a navy rule on top */
.card {
  padding-top: 16px;
  border-top: 2px solid var(--powder);
}
.eyebrow {
  margin: 0;
  color: var(--ink-soft);
}

.average {
  display: flex;
  align-items: baseline;
  margin: 16px 0 4px;
}
.num {
  font-size: 64px;
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.05em;
}
.unit {
  margin-left: 4px;
  font-size: 26px;
  font-weight: 500;
}
.caption {
  padding-bottom: 18px;
}

.rounds {
  list-style: none;
  margin: 0;
  padding: 0;
}
.rounds li {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 14px 0;
  border-top: 1px solid var(--ink-rule);
}
.rounds li:last-child {
  border-bottom: 1px solid var(--ink-rule);
}
.score {
  min-width: 52px;
  font-size: 40px;
  font-weight: 400;
  line-height: 1;
  letter-spacing: -0.04em;
}
.detail {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.verdict {
  font-size: 16px;
  font-weight: 500;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
  margin-top: 22px;
}
.again {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  font: inherit;
  font-weight: 600;
  color: var(--navy);
  background: var(--powder);
  border: 0;
  border-radius: var(--radius-pill);
  cursor: pointer;
}
.again:hover {
  background: var(--icy-deep);
}
.all {
  font-weight: 500;
  color: var(--navy);
}

@media (max-width: 860px) {
  .num { font-size: 68px; }
}
</style>
