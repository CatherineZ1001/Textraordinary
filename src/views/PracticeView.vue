<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue'
import ConversationPage from '@/components/conversation/ConversationPage.vue'
import ModeSwitch from '@/components/conversation/ModeSwitch.vue'
import FeedbackCard from '@/components/conversation/FeedbackCard.vue'
import { sampleScenario } from '@/data/sampleScenario'
import { evaluateReply, type ReplyEvaluation } from '@/ai/evaluateReply'
import { isAbort, NavigatorError } from '@/ai/navigator'
import type { PracticeMode, SubmittedReply } from '@/types/scenario'

// Practice page. For now it shows the conversation page with a sample scenario.
// - PBI 02 will load real scenarios from Firestore instead of sampleScenario.
// - PBI 05 will handle tracking the selected reply properly.
// When a reply is sent, the AI coach grades it and the feedback card appears under the note.
const mode = ref<PracticeMode>('choose')
const selectedId = ref<string | null>(null)

const evalState = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const evaluation = ref<ReplyEvaluation | null>(null)
const evalError = ref('')
let lastReply: SubmittedReply | null = null
let controller: AbortController | null = null

function errorMessage(err: unknown): string {
  if (err instanceof NavigatorError && err.status === 401) {
    return 'No NaviGator API key was found. Set the NAVIGATOR_API_KEY environment variable and restart the dev server.'
  }
  if (err instanceof NavigatorError && err.status === 429) {
    return "You've hit the NaviGator usage limit. Wait a bit and try again."
  }
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}

async function grade(reply: SubmittedReply) {
  controller?.abort()
  const current = (controller = new AbortController())
  lastReply = reply
  evaluation.value = null
  evalState.value = 'loading'
  try {
    evaluation.value = await evaluateReply(sampleScenario, reply, current.signal)
    evalState.value = 'done'
  } catch (err) {
    if (isAbort(err)) return
    console.error('Reply evaluation failed:', err)
    evalError.value = errorMessage(err)
    evalState.value = 'error'
  }
}

function onSubmit(reply: SubmittedReply) {
  void grade(reply)
}

function retry() {
  if (lastReply) void grade(lastReply)
}

// Switching modes clears the sent reply, so clear its feedback too
watch(mode, () => {
  controller?.abort()
  evalState.value = 'idle'
})
onBeforeUnmount(() => controller?.abort())
</script>

<template>
  <main class="practice">
    <div class="top">
      <ModeSwitch v-model="mode" />
    </div>
    <ConversationPage
      :scenario="sampleScenario"
      :mode="mode"
      :selected-id="selectedId"
      @select="(id) => (selectedId = id)"
      @submit="onSubmit"
    >
      <template v-if="evalState !== 'idle'" #feedback>
        <FeedbackCard
          :state="evalState"
          :evaluation="evaluation"
          :error="evalError"
          :contact-name="sampleScenario.contact?.name ?? 'They'"
          :tone="sampleScenario.tone"
          @retry="retry"
        />
      </template>
    </ConversationPage>
  </main>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: center;
  padding: 24px 16px 0;
}
</style>
