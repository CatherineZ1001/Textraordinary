<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import type { ScenarioMessage } from '@/types/scenario'
import MessageBubble from './MessageBubble.vue'

// The scrolling message history.
// `messages` is whatever is visible right now (the page reveals them one by one).
// `typing` shows the "..." bubble from the other person at the bottom.
const props = withDefaults(
  defineProps<{
    messages: ScenarioMessage[]
    typing?: boolean
    firstTime?: string
  }>(),
  { typing: false, firstTime: '' },
)

const items = computed(() =>
  props.messages.map((msg, i) => {
    const next = props.messages[i + 1]
    const prev = props.messages[i - 1]
    const nextIsTyping = !next && props.typing && msg.sender === 'them'
    return {
      ...msg,
      tail: nextIsTyping ? false : !next || next.sender !== msg.sender,
      newGroup: !!prev && prev.sender !== msg.sender,
    }
  }),
)

const lastIsMine = computed(() => props.messages.at(-1)?.sender === 'me' && !props.typing)
const typingNewGroup = computed(() => props.messages.at(-1)?.sender === 'me')

// Keep the view pinned to the newest message whenever content or size changes.
const scroller = ref<HTMLElement | null>(null)
const inner = ref<HTMLElement | null>(null)
let observer: ResizeObserver | undefined
const pin = () => {
  const el = scroller.value
  if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
}
onMounted(() => {
  observer = new ResizeObserver(pin)
  if (scroller.value) observer.observe(scroller.value)
  if (inner.value) observer.observe(inner.value)
})
onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <section ref="scroller" class="thread" aria-label="Conversation" aria-live="polite">
    <div ref="inner" class="inner">
      <p v-if="firstTime" class="stamp"><strong>Today</strong> {{ firstTime }}</p>

      <TransitionGroup name="pop">
        <MessageBubble
          v-for="msg in items"
          :key="msg.id"
          :class="[msg.sender, { 'new-group': msg.newGroup }]"
          :sender="msg.sender"
          :text="msg.text"
          :tail="msg.tail"
        />
        <MessageBubble
          v-if="typing"
          key="typing"
          class="them"
          :class="{ 'new-group': typingNewGroup }"
          sender="them"
          typing
        />
      </TransitionGroup>

      <p v-if="lastIsMine" class="delivered">Delivered</p>
    </div>
  </section>
</template>

<style scoped>
.thread {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
}
.thread::-webkit-scrollbar { display: none; }
.inner {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 12px 14px;
  min-height: 100%;
  justify-content: flex-end;
}
.new-group { margin-top: 10px; }
.stamp {
  margin: 0 0 8px;
  text-align: center;
  font-size: 12px;
  color: var(--ios-secondary);
}
.stamp strong { font-weight: 600; }
.delivered {
  margin: 3px 6px 0 0;
  text-align: right;
  font-size: 12px;
  font-weight: 500;
  color: var(--ios-secondary);
}

/* Bubble "pop" when a message arrives */
.pop-enter-active {
  transition: transform 0.38s cubic-bezier(0.2, 0.9, 0.3, 1.25), opacity 0.2s ease-out;
}
.pop-enter-from { opacity: 0; transform: scale(0.5) translateY(14px); }
.them.pop-enter-active { transform-origin: bottom left; }
.me.pop-enter-active { transform-origin: bottom right; }
.pop-leave-active { display: none; } /* typing bubble vanishes instantly when the message lands */
</style>
