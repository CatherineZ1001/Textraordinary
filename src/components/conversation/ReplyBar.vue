<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'

// The iOS message input bar.
// - Read-only (default): shows `text`, e.g. the reply picked from the options.
// - editable: a real text box bound with v-model, for writing your own reply.
// The send button stays grey while there's nothing to send.
// Emits 'submit' when send is tapped (or Enter is pressed while typing).
const props = withDefaults(
  defineProps<{
    text?: string
    editable?: boolean
    disabled?: boolean
    placeholder?: string
  }>(),
  { text: '', editable: false, disabled: false, placeholder: 'Text Message' },
)
const modelValue = defineModel<string>({ default: '' })
const emit = defineEmits<{ submit: [] }>()

const value = computed(() => (props.editable ? modelValue.value : props.text))
const canSend = computed(() => !props.disabled && value.value.trim().length > 0)

// Auto-grow the text box up to about 5 lines, like iOS
const box = ref<HTMLTextAreaElement | null>(null)
const resize = () => {
  const el = box.value
  if (!el) return
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 112) + 'px'
}
watch(modelValue, () => nextTick(resize))

function onKeydown(e: KeyboardEvent) {
  // Enter sends, Shift+Enter makes a new line
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    if (canSend.value) emit('submit')
  }
}

defineExpose({ focus: () => box.value?.focus() })
</script>

<template>
  <div class="bar">
    <span class="plus" aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16"><path d="M8 2v12M2 8h12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </span>
    <div class="field" :class="{ editable }">
      <textarea
        v-if="editable"
        ref="box"
        rows="1"
        class="value input"
        v-model="modelValue"
        :placeholder="placeholder"
        :disabled="disabled"
        aria-label="Your reply"
        @keydown="onKeydown"
      ></textarea>
      <span v-else class="value" :class="{ empty: !text }">{{ text || placeholder }}</span>

      <button
        type="button"
        class="send"
        :disabled="!canSend"
        aria-label="Send reply"
        @click="emit('submit')"
      >
        <svg width="14" height="16" viewBox="0 0 14 16"><path d="M7 14V2M2 7l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 8px 10px;
  background: var(--screen);
}
.plus {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: #eeeef0;
  color: #85858b;
}
.field {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: flex-end;
  gap: 6px;
  min-height: 36px;
  padding: 3px 3px 3px 14px;
  border: 1px solid #c7c7cc;
  border-radius: 18px;
  transition: border-color 0.15s;
}
.field.editable:focus-within { border-color: #a9a9ae; }
.value {
  flex: 1;
  min-width: 0;
  padding: 4px 0 5px;
  font-size: 17px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.value.empty { color: #b3b3b8; }
.input {
  margin: 0;
  border: 0;
  outline: 0;
  resize: none;
  background: transparent;
  font: inherit;
  font-size: 17px;
  line-height: 1.25;
  color: #000;
  white-space: pre-wrap;
  overflow-y: auto;
  height: 31px;
}
.input::placeholder { color: #b3b3b8; }
.send {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: var(--ios-blue);
  color: #fff;
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}
.send:disabled { background: #d1d1d6; cursor: default; }
.send:not(:disabled):active { transform: scale(0.88); }
.send:focus-visible { outline: 2px solid var(--ios-blue); outline-offset: 2px; }
</style>
