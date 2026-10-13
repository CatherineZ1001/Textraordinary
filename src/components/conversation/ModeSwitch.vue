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
.switch {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: rgba(23, 32, 42, 0.1);
}
button {
  border: 0;
  background: transparent;
  font: inherit;
  font-size: 15px;
  font-weight: 500;
  color: var(--ink);
  padding: 7px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.18s, box-shadow 0.18s;
}
button.on {
  background: #fff;
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(23, 32, 42, 0.18);
}
button:focus-visible { outline: 2px solid var(--ios-blue); outline-offset: 1px; }
</style>
