<script setup lang="ts">
// One chat message, iMessage style.
// 'me' = blue on the right, 'them' = grey on the left.
// `tail` adds the curled tail on the last bubble of a run.
// `typing` turns the bubble into the animated "..." indicator.
withDefaults(
  defineProps<{
    sender: 'me' | 'them'
    text?: string
    tail?: boolean
    typing?: boolean
  }>(),
  { text: '', tail: true, typing: false },
)
</script>

<template>
  <div class="row" :class="[sender, { tail }]">
    <p v-if="typing" class="bubble typing" aria-label="Typing">
      <span></span><span></span><span></span>
    </p>
    <p v-else class="bubble">{{ text }}</p>
  </div>
</template>

<style scoped>
.row { display: flex; padding: 0 4px; }
.row.me { justify-content: flex-end; }

.bubble {
  position: relative;
  margin: 0;
  max-width: 76%;
  padding: 7px 12px 8px;
  border-radius: 18px;
  font-size: 17px;
  line-height: 1.29;
  letter-spacing: -0.01em;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.them .bubble { background: var(--ios-grey-bubble); color: #000; }
.me .bubble { background: var(--ios-blue); color: #fff; }

/* The curled tail: a coloured blob, then a white blob that cuts the curve */
.tail .bubble::before,
.tail .bubble::after {
  content: '';
  position: absolute;
  bottom: 0;
  height: 20px;
}
.them.tail .bubble::before {
  left: -7px;
  width: 20px;
  background: var(--ios-grey-bubble);
  border-bottom-right-radius: 16px 14px;
}
.them.tail .bubble::after {
  left: -26px;
  width: 26px;
  background: var(--screen);
  border-bottom-right-radius: 10px;
}
.me.tail .bubble::before {
  right: -7px;
  width: 20px;
  background: var(--ios-blue);
  border-bottom-left-radius: 16px 14px;
}
.me.tail .bubble::after {
  right: -26px;
  width: 26px;
  background: var(--screen);
  border-bottom-left-radius: 10px;
}

/* Typing indicator */
.typing {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 36px;
  padding: 0 14px;
}
.typing span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #999ba1;
  animation: blink 1.2s infinite ease-in-out;
}
.typing span:nth-child(2) { animation-delay: 0.18s; }
.typing span:nth-child(3) { animation-delay: 0.36s; }
@keyframes blink {
  0%, 60%, 100% { opacity: 0.35; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-2px); }
}
</style>
