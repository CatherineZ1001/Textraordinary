<script setup lang="ts">
import type { PracticeMode } from '@/types/scenario'

// iOS-style segmented control for switching practice mode.
// Use with v-model: <ModeSwitch v-model="mode" />
const mode = defineModel<PracticeMode>({ required: true })

const modes: { value: PracticeMode; label: string }[] = [
  { value: 'choose', label: 'Pick a reply' },
  { value: 'write', label: 'Write your own' },
]
</script>

<template>
  <div class="switch" role="radiogroup" aria-label="Practice mode">
    <button
      v-for="m in modes"
      :key="m.value"
      type="button"
      role="radio"
      :aria-checked="mode === m.value"
      :class="{ on: mode === m.value }"
      @click="mode = m.value"
    >
      {{ m.label }}
    </button>
  </div>
</template>

<style scoped>
/* A pale icy-blue pill with the chosen mode in a deeper icy blue */
.switch {
  display: inline-flex;
  padding: 4px;
  border-radius: var(--radius-pill);
  background: var(--powder-soft);
}
button {
  flex: 1;
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  color: var(--ink-soft);
  padding: 8px 18px;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.18s, color 0.18s;
}
button:hover { color: var(--navy); }
button.on {
  background: var(--powder);
  color: var(--navy);
  font-weight: 600;
}
</style>
