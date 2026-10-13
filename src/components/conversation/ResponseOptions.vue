<script setup lang="ts">
import type { ScenarioOption } from '@/types/scenario'

// Suggested replies, shown where the iPhone keyboard would be.
// Emits 'select' with the option id when one is tapped.
// selectedId is passed in by the parent (PBI 05 owns tracking it).
withDefaults(
  defineProps<{
    options: ScenarioOption[]
    selectedId?: string | null
    disabled?: boolean
  }>(),
  { selectedId: null, disabled: false },
)
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <fieldset class="tray" :disabled="disabled">
    <legend>Pick the reply you'd send</legend>
    <button
      v-for="opt in options"
      :key="opt.id"
      type="button"
      class="draft"
      :class="{ selected: opt.id === selectedId }"
      :aria-pressed="opt.id === selectedId"
      @click="emit('select', opt.id)"
    >
      <span class="check" aria-hidden="true"></span>
      <span class="text">{{ opt.text }}</span>
    </button>
  </fieldset>
</template>

<style scoped>
.tray {
  margin: 0;
  border: 0;
  background: var(--ios-keyboard);
  padding: 10px 8px 30px;  /* bottom room for the home indicator */
  display: flex;
  flex-direction: column;
  gap: 6px;
}
legend {
  float: left;
  width: 100%;
  padding: 0 6px 4px;
  font-size: 13px;
  font-weight: 500;
  color: #5d6068;
}
.draft {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  text-align: left;
  font: inherit;
  font-size: 15px;
  line-height: 1.3;
  color: #000;
  background: #fff;
  border: 0;
  border-radius: 10px;
  padding: 10px 12px 10px 10px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.28);  /* iOS key shadow */
  cursor: pointer;
  transition: background 0.12s, box-shadow 0.12s;
}
.draft:active { background: #f0f0f2; }
.draft:focus-visible { outline: 2px solid var(--ios-blue); outline-offset: 1px; }
.draft.selected {
  background: #e7f0ff;
  box-shadow: 0 0 0 2px var(--ios-blue);
}
.check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1.5px solid #c4c4c9;
  background: #fff;
}
.selected .check {
  border-color: var(--ios-blue);
  background: var(--ios-blue) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 14px no-repeat;
}
.tray:disabled .draft { cursor: not-allowed; opacity: 0.55; }

@media (max-width: 860px) {
  .tray { padding-bottom: 12px; }
}
</style>
