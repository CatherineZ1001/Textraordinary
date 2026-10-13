<script setup lang="ts">
import { computed } from 'vue'
import type { ReplyEvaluation } from '@/ai/evaluateReply'
import MessageBubble from './MessageBubble.vue'

// The coach's feedback on the reply the user just sent.
// Styled as a graded index card taped to the desk under the scenario note,
// with a rubber-stamped score and comments in the coach's handwriting.
// state: 'loading' while the AI reads the reply, 'done' with an evaluation, 'error' with a message.
const props = withDefaults(
  defineProps<{
    state: 'loading' | 'done' | 'error'
    evaluation?: ReplyEvaluation | null
    error?: string
    contactName: string
    tone: string
  }>(),
  { evaluation: null, error: '' },
)
const emit = defineEmits<{ retry: [] }>()

// Stamp ink: green for strong replies, amber for okay, red for ones to rethink
const ink = computed(() => {
  const score = props.evaluation?.score ?? 0
  return score >= 8 ? 'good' : score >= 5 ? 'okay' : 'poor'
})

const toneLabels = {
  'on-target': { mark: '✓', text: 'On target' },
  close: { mark: '≈', text: 'Close' },
  off: { mark: '✗', text: 'Missed it' },
} as const
const toneMatch = computed(() => toneLabels[props.evaluation?.toneMatch ?? 'close'])
</script>

<template>
  <article class="card" :aria-busy="state === 'loading'" aria-live="polite">
    <span class="tape" aria-hidden="true"></span>

    <!-- Waiting for the coach -->
    <div v-if="state === 'loading'" class="loading">
      <p class="hand label">Coach's feedback</p>
      <p class="reading">Coach is reading your reply</p>
      <MessageBubble class="dots" sender="them" typing :tail="false" />
      <div class="scribbles" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    </div>

    <!-- Something went wrong -->
    <div v-else-if="state === 'error'" class="error">
      <p class="hand label">Coach's feedback</p>
      <h2>The coach couldn't grade this one</h2>
      <p class="message">{{ error }}</p>
      <button type="button" class="retry" @click="emit('retry')">Try again</button>
    </div>

    <!-- The graded card -->
    <div v-else-if="evaluation" class="graded">
      <p class="hand label">Coach's feedback</p>

      <div class="stamp" :class="ink" role="img" :aria-label="`Score: ${evaluation.score} out of 10`">
        <span class="num">{{ evaluation.score }}</span>
        <span class="outof">/10</span>
      </div>

      <h2><span class="swipe">{{ evaluation.verdict }}</span></h2>

      <p class="tone">
        <span class="muted">Aim for</span>
        <strong>{{ tone }}</strong>
        <span class="chip" :class="evaluation.toneMatch">
          <span aria-hidden="true">{{ toneMatch.mark }}</span> {{ toneMatch.text }}
        </span>
      </p>

      <!-- Which suggested reply was best (only when the user picked one) -->
      <section v-if="evaluation.bestOption" class="best" :class="{ picked: evaluation.bestOption.picked }">
        <h3 class="hand">
          {{ evaluation.bestOption.picked ? 'You picked the best reply!' : 'The best reply' }}
        </h3>
        <p class="option">
          <span class="check" aria-hidden="true"></span>
          <span class="letter">{{ evaluation.bestOption.letter }}</span>
          <span>{{ evaluation.bestOption.text }}</span>
        </p>
        <p v-if="evaluation.bestOption.why" class="why">
          <strong>Why it works:</strong> {{ evaluation.bestOption.why }}
        </p>
      </section>

      <section v-if="evaluation.strengths.length" class="notes worked">
        <h3 class="hand">What worked</h3>
        <ul>
          <li v-for="(s, i) in evaluation.strengths" :key="i">{{ s }}</li>
        </ul>
      </section>

      <section v-if="evaluation.improvements.length" class="notes fix">
        <h3 class="hand">Try next time</h3>
        <ul>
          <li v-for="(s, i) in evaluation.improvements" :key="i">{{ s }}</li>
        </ul>
      </section>

      <section v-if="evaluation.likelyReaction" class="quote">
        <h3 class="hand">How {{ contactName }} might take it</h3>
        <MessageBubble sender="them" :text="evaluation.likelyReaction" :tail="false" />
      </section>

      <section v-if="evaluation.suggestedRewrite" class="quote">
        <h3 class="hand">A stronger version</h3>
        <MessageBubble sender="me" :text="evaluation.suggestedRewrite" :tail="false" />
      </section>
    </div>
  </article>
</template>

<style scoped>
.card {
  --rule: rgba(0, 122, 255, 0.11);
  --margin: rgba(230, 70, 70, 0.4);
  --pen-red: #c8352e;
  --pen-green: #1f8a4c;
  --pen-amber: #b7700a;

  position: relative;
  padding: 26px 26px 24px 46px;
  border-radius: 3px;
  /* an index card: red margin line on the left, faint blue rules every 28px */
  background:
    linear-gradient(90deg, transparent 30px, var(--margin) 30px, var(--margin) 31.5px, transparent 31.5px),
    repeating-linear-gradient(transparent 0 27px, var(--rule) 27px 28px),
    #fffefb;
  background-position: 0 0, 0 18px, 0 0;
  box-shadow: 0 1px 0 rgba(23, 32, 42, 0.08), 0 14px 30px -18px rgba(23, 32, 42, 0.45);
  transform: rotate(0.8deg);
}

/* a strip of washi tape holding the card to the desk */
.tape {
  position: absolute;
  top: -11px;
  left: 50%;
  width: 96px;
  height: 24px;
  transform: translateX(-50%) rotate(-3deg);
  background: repeating-linear-gradient(45deg, rgba(0, 122, 255, 0.22) 0 6px, rgba(0, 122, 255, 0.14) 6px 12px);
  border-left: 2px dotted rgba(255, 255, 255, 0.6);
  border-right: 2px dotted rgba(255, 255, 255, 0.6);
  box-shadow: 0 1px 2px rgba(23, 32, 42, 0.12);
}

.hand {
  font-family: var(--font-hand);
  font-weight: 700;
  color: var(--pen-red);
  line-height: 1.1;
}
.label {
  margin: 0 0 6px;
  font-size: 22px;
  transform: rotate(-2deg);
  transform-origin: left;
}

h2 {
  font-size: 24px;
  line-height: 1.15;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 12px;
  padding-right: 88px; /* room for the stamp */
}
.swipe {
  /* the same highlighter swipe as the tone on the scenario note */
  background: linear-gradient(transparent 55%, rgba(0, 122, 255, 0.24) 55%);
  padding: 0 2px;
  font-weight: inherit; /* base.css resets every element to normal */
  box-decoration-break: clone;
  -webkit-box-decoration-break: clone;
}

/* ---- Score stamp --------------------------------------------------------- */
.stamp {
  --ink: var(--pen-red);
  position: absolute;
  top: 18px;
  right: 18px;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  display: flex;
  align-items: baseline;
  justify-content: center;
  padding-top: 18px;
  box-sizing: border-box;
  color: var(--ink);
  border: 3px solid var(--ink);
  box-shadow: inset 0 0 0 3px #fffefb, inset 0 0 0 5px var(--ink); /* double ring */
  transform: rotate(-12deg);
  opacity: 0.88;
  /* uneven ink, like a real rubber stamp */
  mask-image: radial-gradient(circle at 30% 70%, #000 55%, rgba(0, 0, 0, 0.75) 75%, #000 90%);
  animation: thunk 0.45s cubic-bezier(0.3, 1.5, 0.5, 1) 0.15s both;
}
.stamp.good { --ink: var(--pen-green); }
.stamp.okay { --ink: var(--pen-amber); }
.num { font-size: 38px; font-weight: 800; line-height: 1; letter-spacing: -0.04em; }
.outof { font-size: 14px; font-weight: 700; }
@keyframes thunk {
  from { transform: rotate(-12deg) scale(1.8); opacity: 0; }
  to { transform: rotate(-12deg) scale(1); opacity: 0.88; }
}

/* ---- Tone match --------------------------------------------------------- */
.tone {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
  margin: 0 0 16px;
  font-size: 15px;
}
.muted { color: rgba(23, 32, 42, 0.6); font-size: 14px; }
.chip {
  font-size: 13px;
  font-weight: 700;
  padding: 1px 9px;
  border-radius: 999px;
  border: 1.5px solid currentColor;
}
.chip.on-target { color: var(--pen-green); }
.chip.close { color: var(--pen-amber); }
.chip.off { color: var(--pen-red); }

/* ---- Best option: looks like the selected reply in the phone's tray ------- */
.best h3 { font-size: 21px; margin: 0 0 6px; }
.best.picked h3 { color: var(--pen-green); }
.option {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 9px 12px 9px 10px;
  border-radius: 10px;
  background: #e7f0ff;
  box-shadow: 0 0 0 2px var(--ios-blue);
  font-family: var(--font-ios);
  font-size: 15px;
  line-height: 1.3;
}
.check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--ios-blue) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 14px no-repeat;
}
.letter { font-weight: 700; color: var(--ios-blue); }
.why { margin: 8px 0 0; font-size: 15px; line-height: 1.45; }
.why strong { font-weight: 700; }

/* ---- Notes ---------------------------------------------------------------- */
.notes, .quote, .best { margin-top: 14px; }
.notes h3, .quote h3 { font-size: 21px; margin: 0 0 4px; }
.worked h3 { color: var(--pen-green); }
ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
li {
  position: relative;
  padding-left: 24px;
  font-size: 15px;
  line-height: 1.45;
}
li::before {
  position: absolute;
  left: 0;
  top: -3px;
  font-family: var(--font-hand);
  font-size: 22px;
  font-weight: 700;
}
.worked li::before { content: '✓'; color: var(--pen-green); }
.fix li::before { content: '→'; color: var(--pen-red); }

.quote :deep(.bubble) { font-family: var(--font-ios); font-size: 15px; max-width: 88%; }
.quote :deep(.row) { padding: 0; }

/* ---- Loading -------------------------------------------------------------- */
.reading { margin: 0 0 8px; font-weight: 600; }
.dots :deep(.row) { padding: 0; }
.scribbles { display: grid; gap: 12px; margin-top: 16px; }
.scribbles span {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(23, 32, 42, 0.07) 0%, rgba(23, 32, 42, 0.16) 50%, rgba(23, 32, 42, 0.07) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}
.scribbles span:nth-child(1) { width: 88%; }
.scribbles span:nth-child(2) { width: 70%; animation-delay: 0.15s; }
.scribbles span:nth-child(3) { width: 45%; animation-delay: 0.3s; }
@keyframes shimmer {
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
}

/* ---- Error ---------------------------------------------------------------- */
.error h2 { padding-right: 0; font-size: 20px; }
.message { margin: 0 0 14px; font-size: 15px; color: rgba(23, 32, 42, 0.75); }
.retry {
  font: inherit;
  font-weight: 600;
  font-size: 14px;
  padding: 7px 16px;
  border-radius: 999px;
  border: 0;
  background: var(--ink);
  color: #fff;
  cursor: pointer;
}
.retry:focus-visible { outline: 2px solid var(--ios-blue); outline-offset: 2px; }

@media (max-width: 860px) {
  .card { transform: none; padding: 22px 18px 20px 40px; }
  .card { background-position: -6px 0, 0 18px, 0 0; }
  h2 { font-size: 21px; }
}
</style>
