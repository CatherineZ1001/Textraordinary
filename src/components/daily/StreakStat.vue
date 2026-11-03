<script setup lang="ts">
import { computed } from 'vue'
import type { Streak } from '@/data/streaks'

// The member's daily-challenge streak (PBI 18) as a big number, with their best run beside it.
const props = defineProps<{ streak: Streak }>()

const hint = computed(() => {
  const { current, doneToday } = props.streak
  if (current === 0) return 'Finish today’s challenge to start a streak.'
  if (!doneToday) return 'Play today’s challenge to keep it going.'
  return 'Come back tomorrow to keep it going.'
})
</script>

<template>
  <div class="streak" role="group" aria-label="Daily challenge streak">
    <p class="stat">
      <span class="num" data-testid="streak-current">{{ streak.current }}</span>
      <span class="unit">day streak</span>
    </p>
    <p class="best">Best: {{ streak.best }} {{ streak.best === 1 ? 'day' : 'days' }}</p>
    <p class="hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.streak {
  padding-top: 14px;
  border-top: 2px solid var(--lime);
}
p {
  margin: 0;
}
.stat {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.num {
  font-size: 56px;
  font-weight: 400;
  line-height: 0.95;
  letter-spacing: -0.05em;
  font-variant-numeric: tabular-nums;
}
.unit {
  font-size: 18px;
  font-weight: 500;
}
.best {
  margin-top: 6px;
  font-size: 14px;
  font-weight: 600;
}
.hint {
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-soft);
}
</style>
