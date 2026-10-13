<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import type { PracticeMode, Scenario, SubmittedReply } from '@/types/scenario'
import ScenarioHeader from './ScenarioHeader.vue'
import PhoneFrame from './PhoneFrame.vue'
import LockScreen from './LockScreen.vue'
import ChatNavBar from './ChatNavBar.vue'
import ConversationThread from './ConversationThread.vue'
import ReplyBar from './ReplyBar.vue'
import ResponseOptions from './ResponseOptions.vue'
import { unlockAudio, isAudioUnlocked, playReceive, playSend } from '@/audio/messageSounds'

// The reusable conversation page (PBI 01). Pass in any Scenario
// (see src/types/scenario.ts for the shape).
//
// mode:
//   'choose' - pick from the suggested replies (Epic SR)
//   'write'  - type your own reply (Epic CR)
//
// Flow: dark screen -> click to wake -> notification (with sound)
// -> tap notification -> messages arrive one by one with typing dots and sounds
// -> user replies -> reply is "sent" into the chat.
// Set :intro="false" to skip straight to the finished conversation.
//
// Emits:
//   select(optionId)   - a suggested reply was tapped
//   submit(reply)      - the reply was sent (PBI 07 / PBI 09 grade it)
//
// Slots:
//   response  - replaces the suggested-reply tray
//   feedback  - shown under the scenario note, e.g. the coach's grade for the reply
const props = withDefaults(
  defineProps<{
    scenario: Scenario
    mode?: PracticeMode
    selectedId?: string | null
    intro?: boolean
  }>(),
  { mode: 'choose', selectedId: null, intro: true },
)
const emit = defineEmits<{ select: [id: string]; submit: [reply: SubmittedReply] }>()

const contactName = computed(() => props.scenario.contact?.name ?? 'Contact')
const messages = computed(() => props.scenario.messages ?? [])
const firstIncoming = computed(() => messages.value.find((m) => m.sender === 'them'))
const selectedText = computed(
  () => props.scenario.options?.find((o) => o.id === props.selectedId)?.text ?? '',
)

// --- Playback ---------------------------------------------------------------
// phase: 'locked' (lock screen) -> 'playing' (messages arriving)
//        -> 'ready' (user replies) -> 'sent' (reply delivered)
type Phase = 'locked' | 'playing' | 'ready' | 'sent'
const phase = ref<Phase>('locked')
const asleep = ref(true) // lock screen still dark (before the first click)
const visibleCount = ref(0)
const typing = ref(false)
const sentText = ref('')
const draft = ref('')
const replyBar = ref<InstanceType<typeof ReplyBar> | null>(null)

const visibleMessages = computed(() => {
  const shown = messages.value.slice(0, visibleCount.value)
  return sentText.value
    ? [...shown, { id: 'user-reply', sender: 'me' as const, text: sentText.value }]
    : shown
})

let runId = 0 // bumping this cancels any playback in progress
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

async function play() {
  const id = ++runId
  const alive = () => id === runId
  phase.value = 'playing'
  visibleCount.value = 0

  if (reducedMotion()) {
    visibleCount.value = messages.value.length
    void playReceive()
    becomeReady()
    return
  }

  await wait(450)
  for (const msg of messages.value) {
    if (!alive()) return
    if (msg.sender === 'them') {
      typing.value = true
      // longer messages "take longer to type"
      await wait(Math.min(700 + msg.text.length * 16, 1800))
      if (!alive()) return
      typing.value = false
      visibleCount.value++
      void playReceive()
      await wait(550)
    } else {
      await wait(650)
      if (!alive()) return
      visibleCount.value++
      void playSend()
      await wait(450)
    }
  }
  if (alive()) becomeReady()
}

function becomeReady() {
  phase.value = 'ready'
  if (props.mode === 'write') void nextTick(() => replyBar.value?.focus())
}

function start() {
  runId++
  typing.value = false
  sentText.value = ''
  draft.value = ''
  if (!props.intro) {
    visibleCount.value = messages.value.length
    becomeReady()
  } else if (isAudioUnlocked()) {
    // already tapped once this session (e.g. moving to the next scenario)
    void play()
  } else {
    visibleCount.value = 0
    asleep.value = true
    phase.value = 'locked'
  }
}

function openFromLockScreen() {
  unlockAudio()
  void play()
}

// --- Replying -----------------------------------------------------------------
function send() {
  if (phase.value !== 'ready') return
  const text = (props.mode === 'choose' ? selectedText.value : draft.value).trim()
  if (!text) return
  sentText.value = text
  draft.value = ''
  phase.value = 'sent'
  void playSend()
  emit('submit', {
    mode: props.mode,
    optionId: props.mode === 'choose' ? props.selectedId : null,
    text,
  })
}

// Switching modes lets the user try again with the other input
watch(
  () => props.mode,
  () => {
    if (phase.value === 'sent') {
      sentText.value = ''
      becomeReady()
    } else if (phase.value === 'ready') {
      becomeReady()
    }
  },
)

onMounted(start)
watch(() => props.scenario.id, start)
onBeforeUnmount(() => runId++)

const placeholder = computed(() => {
  if (phase.value === 'sent') return 'Text Message'
  if (props.mode === 'write') return phase.value === 'ready' ? 'Write your reply' : 'Text Message'
  return phase.value === 'ready' ? 'Choose a reply below' : 'Text Message'
})
</script>

<template>
  <div class="page">
    <div class="side" :class="{ 'has-feedback': $slots.feedback }">
      <ScenarioHeader
        :title="scenario.title"
        :category="scenario.category"
        :tone="scenario.tone"
        :context="scenario.context"
      />
      <Transition name="drop">
        <div v-if="$slots.feedback" class="feedback">
          <slot name="feedback" />
        </div>
      </Transition>
    </div>

    <PhoneFrame
      class="phone"
      :status-tone="phase === 'locked' ? 'light' : 'dark'"
      :screen-off="phase === 'locked' && asleep"
    >
      <ChatNavBar :name="contactName" :role="scenario.contact?.role" />

      <ConversationThread
        :messages="visibleMessages"
        :typing="typing"
        :first-time="messages[0]?.time"
      />

      <ReplyBar
        ref="replyBar"
        v-model="draft"
        :class="{ 'home-space': !(phase === 'ready' && mode === 'choose') }"
        :editable="mode === 'write'"
        :disabled="phase !== 'ready'"
        :text="phase === 'ready' ? selectedText : ''"
        :placeholder="placeholder"
        @submit="send"
      />

      <!-- Suggested replies rise like the keyboard once messages finish.
           In 'write' mode the input bar above is the whole interface. -->
      <Transition name="keyboard">
        <div v-if="phase === 'ready' && mode === 'choose'" class="keyboard">
          <slot name="response">
            <ResponseOptions
              v-if="scenario.options?.length"
              :options="scenario.options"
              :selected-id="selectedId"
              @select="(id) => emit('select', id)"
            />
          </slot>
        </div>
      </Transition>

      <Transition name="unlock">
        <LockScreen
          v-if="phase === 'locked'"
          :contact-name="contactName"
          :preview="firstIncoming?.text"
          @wake="asleep = false"
          @open="openFromLockScreen"
        />
      </Transition>
    </PhoneFrame>
  </div>
</template>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 24px 64px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 400px;
  gap: 56px;
  align-items: start;
}
.side {
  position: sticky;
  top: 56px;
  margin-top: 8px;
}
/* the feedback card can make the column taller than the window, so let it scroll with the page */
.side.has-feedback { position: static; }
.feedback { margin-top: 30px; }

/* the feedback card is dropped onto the desk */
.drop-enter-active { transition: transform 0.45s cubic-bezier(0.2, 0.9, 0.3, 1.1), opacity 0.3s; }
.drop-leave-active { transition: opacity 0.2s; }
.drop-enter-from { opacity: 0; transform: translateY(-16px) scale(0.97); }
.drop-leave-to { opacity: 0; }
.phone { position: sticky; top: 24px; }

/* room for the home indicator when nothing sits under the input bar */
.home-space { padding-bottom: 30px; }

.keyboard-enter-active { transition: transform 0.42s cubic-bezier(0.2, 0.85, 0.25, 1); }
.keyboard-leave-active { transition: transform 0.3s cubic-bezier(0.5, 0, 0.75, 0); }
.keyboard-enter-from,
.keyboard-leave-to { transform: translateY(100%); }

.unlock-leave-active { transition: transform 0.45s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.45s; }
.unlock-leave-to { transform: translateY(-100%); opacity: 0.6; }

@media (max-width: 860px) {
  .page {
    grid-template-columns: 1fr;
    gap: 16px;
    padding: 16px;
  }
  /* stacked: note, then phone, then the feedback card under the phone */
  .side { display: contents; }
  .feedback { order: 1; margin-top: 8px; }
  .phone { position: static; }
  .home-space { padding-bottom: 12px; }
}
</style>
