<script setup lang="ts">
import { computed } from 'vue'
import type { ReplyEvaluation } from '@/ai/evaluateReply'
import MessageBubble from './MessageBubble.vue'

// The coach's feedback on the reply the user just sent. It sits directly on the practice page's
// panel, in the right-hand column: the score as a big stat, then labelled sections separated by hairlines.
// state: 'loading' while the AI reads the reply, 'done' with an evaluation, 'error' with a message.
// The Continue button sits at the bottom of the graded card, so the user reads the feedback before
// moving on; `last` turns it into "Finish scenario". An error offers to skip the feedback instead.
const props = withDefaults(
  defineProps<{
    state: 'loading' | 'done' | 'error'
    evaluation?: ReplyEvaluation | null
    error?: string
    contactName: string
    tone: string
    last?: boolean
  }>(),
  { evaluation: null, error: '', last: false },
)
const emit = defineEmits<{ retry: []; continue: [] }>()

// Score band (good / okay / poor), kept as a class on the score
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
    <!-- Waiting for the coach -->
    <div v-if="state === 'loading'" class="loading">
      <p class="eyebrow">Coach's feedback</p>
      <p class="reading">Coach is reading your reply</p>
      <MessageBubble class="dots" sender="them" typing :tail="false" />
      <div class="scribbles" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    </div>

    <!-- Something went wrong -->
    <div v-else-if="state === 'error'" class="error">
      <p class="eyebrow">Coach's feedback</p>
      <h2>The coach couldn't grade this one</h2>
      <p class="message">{{ error }}</p>
      <div class="error-actions">
        <button type="button" class="retry" @click="emit('retry')">Try again</button>
        <button type="button" class="skip" @click="emit('continue')">
          Skip feedback and {{ last ? 'finish' : 'continue' }}
        </button>
      </div>
    </div>

    <!-- The graded card -->
    <div v-else-if="evaluation" class="graded">
      <p class="eyebrow">Coach's feedback</p>

      <div class="headline">
        <div
          class="score"
          :class="ink"
          role="img"
          :aria-label="`Score: ${evaluation.score} out of 10`"
        >
          <span class="num">{{ evaluation.score }}</span><span class="outof">/10</span>
        </div>
        <h2>{{ evaluation.verdict }}</h2>
      </div>

      <div class="tone">
        <p class="eyebrow">Aim for</p>
        <p class="tone-row">
          <strong>{{ tone }}</strong>
          <span class="chip" :class="evaluation.toneMatch">
            <span aria-hidden="true">{{ toneMatch.mark }}</span> {{ toneMatch.text }}
          </span>
        </p>
      </div>

      <!-- Which suggested reply was best (only when the user picked one) -->
      <section
        v-if="evaluation.bestOption"
        class="best"
        :class="{ picked: evaluation.bestOption.picked }"
      >
        <h3 class="eyebrow">
          {{ evaluation.bestOption.picked ? 'You picked the best reply' : 'The best reply' }}
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
        <h3 class="eyebrow">What worked</h3>
        <ul>
          <li v-for="(s, i) in evaluation.strengths" :key="i">{{ s }}</li>
        </ul>
      </section>

      <section v-if="evaluation.improvements.length" class="notes fix">
        <h3 class="eyebrow">Try next time</h3>
        <ul>
          <li v-for="(s, i) in evaluation.improvements" :key="i">{{ s }}</li>
        </ul>
      </section>

      <section v-if="evaluation.likelyReaction" class="quote">
        <h3 class="eyebrow">How {{ contactName }} might take it</h3>
        <MessageBubble sender="them" :text="evaluation.likelyReaction" :tail="false" />
      </section>

      <section v-if="evaluation.suggestedRewrite" class="quote">
        <h3 class="eyebrow">A stronger version</h3>
        <MessageBubble sender="me" :text="evaluation.suggestedRewrite" :tail="false" />
      </section>

      <button type="button" class="continue" @click="emit('continue')">
        {{ last ? 'Finish scenario' : 'Continue conversation' }} <span aria-hidden="true">→</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
/* No box: the feedback sits directly on the panel, sections divided by navy hairlines */
.card {
  padding-top: 16px;
  border-top: 2px solid var(--powder);
}
.eyebrow {
  margin: 0;
  color: var(--ink-soft);
}

h2 {
  margin: 0;
  font-size: 21px;
  line-height: 1.2;
  font-weight: 500;
  letter-spacing: -0.02em;
}

/* ---- Score: a big stat ----------------------------------------------------- */
.headline {
  display: flex;
  align-items: center;
  gap: 22px;
  margin: 12px 0 18px;
}
.score {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  color: var(--navy);
  animation: pop 0.4s cubic-bezier(0.3, 1.4, 0.5, 1) 0.1s both;
}
.num { font-size: 56px; font-weight: 400; line-height: 0.9; letter-spacing: -0.05em; }
.outof { margin-left: 3px; font-size: 22px; font-weight: 500; opacity: 0.7; }
@keyframes pop {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* ---- Tone match --------------------------------------------------------- */
.tone {
  padding: 16px 0;
  border-top: 1px solid var(--ink-rule);
}
.tone-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin: 4px 0 0;
  font-size: 18px;
}
.tone-row strong { font-weight: 500; }
.chip {
  font-size: 13px;
  font-weight: 600;
  padding: 3px 11px;
  border-radius: var(--radius-pill);
  border: 1.5px solid currentColor;
}
.chip.on-target { background: var(--powder); border-color: var(--powder); }
.chip.close { border-color: var(--powder); }
.chip.off { border-color: var(--ink-rule); color: var(--ink-soft); }

/* ---- Sections: an uppercase label over each, hairlines between ----------- */
.best, .notes, .quote {
  padding: 16px 0;
  border-top: 1px solid var(--ink-rule);
}
.best h3, .notes h3, .quote h3 { margin-bottom: 8px; }

/* the best option: a pale icy strip with an icy check */
.option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  background: var(--powder-soft);
  font-size: 15px;
  line-height: 1.4;
}
.check {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  border-radius: 50%;
  background: var(--powder) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath d='M4 8.5l2.5 2.5L12 5.5' fill='none' stroke='%232b3541' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center / 14px no-repeat;
}
.letter { font-weight: 700; }
.why { margin: 10px 0 0; font-size: 15px; line-height: 1.5; }
.why strong { font-weight: 600; }

ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
li {
  position: relative;
  padding-left: 24px;
  font-size: 15px;
  line-height: 1.5;
}
li::before {
  position: absolute;
  left: 0;
  top: 0;
  font-weight: 600;
}
.worked li::before { content: '✓'; }
.fix li::before { content: '→'; color: var(--ink-soft); }

/* the quoted texts stay iMessage bubbles, like the phone */
.quote :deep(.bubble) { font-family: var(--font-ios); font-size: 15px; max-width: 88%; }
.quote :deep(.row) { padding: 0; }

/* ---- Loading -------------------------------------------------------------- */
.reading { margin: 10px 0 8px; font-size: 18px; font-weight: 500; }
.dots :deep(.row) { padding: 0; }
.scribbles { display: grid; gap: 12px; margin-top: 18px; }
.scribbles span {
  height: 10px;
  border-radius: 6px;
  background: linear-gradient(90deg, rgba(43, 53, 65, 0.08) 0%, rgba(43, 53, 65, 0.18) 50%, rgba(43, 53, 65, 0.08) 100%);
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
.error h2 { margin: 10px 0 8px; font-size: 22px; }
.message { margin: 0 0 18px; font-size: 15px; color: var(--ink-soft); }
.error-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
}
.retry {
  font: inherit;
  font-weight: 600;
  font-size: 15px;
  padding: 9px 20px;
  border-radius: var(--radius-pill);
  border: 0;
  background: var(--powder);
  color: var(--navy);
  cursor: pointer;
}
.retry:hover { background: var(--icy-deep); }
.skip {
  font: inherit;
  font-size: 14px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--navy);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

/* ---- Continue: the one way forward, after the feedback ------------------- */
.continue {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  margin-top: 8px;
  padding: 15px 20px;
  font: inherit;
  font-weight: 600;
  font-size: 16px;
  color: var(--navy);
  background: var(--powder);
  border: 0;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: background 0.15s;
}
.continue span { transition: transform 0.15s; }
.continue:hover { background: var(--icy-deep); }
.continue:hover span { transform: translateX(3px); }

@media (max-width: 860px) {
  h2 { font-size: 22px; }
  .num { font-size: 56px; }
}
</style>
