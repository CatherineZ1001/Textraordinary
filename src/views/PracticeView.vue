<script setup lang="ts">
import { ref } from 'vue'
import ConversationPage from '@/components/conversation/ConversationPage.vue'
import ModeSwitch from '@/components/conversation/ModeSwitch.vue'
import { sampleScenario } from '@/data/sampleScenario'
import type { PracticeMode, SubmittedReply } from '@/types/scenario'

// Practice page. For now it shows the conversation page with a sample scenario.
// - PBI 02 will load real scenarios from Firestore instead of sampleScenario.
// - PBI 05 will handle tracking the selected reply properly.
// - PBI 07 / PBI 09 will grade the submitted reply in onSubmit.
const mode = ref<PracticeMode>('choose')
const selectedId = ref<string | null>(null)

function onSubmit(reply: SubmittedReply) {
  console.info('Reply sent:', reply)
}
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
    />
  </main>
</template>

<style scoped>
.top {
  display: flex;
  justify-content: center;
  padding: 24px 16px 0;
}
</style>
