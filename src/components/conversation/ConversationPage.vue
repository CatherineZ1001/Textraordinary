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
import { threadBefore } from '@/data/thread'

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
// Rounds: a scenario can have several rounds. `round` is the one being played and `history`
// holds the replies to the earlier rounds. When the parent moves `round` on, the contact's
// reaction and the next round's messages play below the sent reply.
//
// Emits:
//   select(optionId)   - a suggested reply was tapped
//   submit(reply)      - the reply was sent (PBI 07 / PBI 09 grade it)
//
// Slots:
//   response  - replaces the suggested-reply tray
//   feedback  - the right-hand column, e.g. the coach's grade for the reply
//
// Layout (wide screens): brief | phone | feedback, filling the height it is given. The phone is
// drawn at 400x820 and scaled down with CSS zoom to fit that height.
const props = withDefaults(
  defineProps<{
    scenario: Scenario
    mode?: PracticeMode
    selectedId?: string | null
    intro?: boolean
    round?: number
    history?: SubmittedReply[]
    /** Input bar text after the reply is sent */
    sentPlaceholder?: string
  }>(),
  {
    mode: 'choose',
    selectedId: null,
    intro: true,
    round: 0,
    history: () => [],
    sentPlaceholder: 'Text Message',
  },
)
const emit = defineEmits<{ select: [id: string]; submit: [reply: SubmittedReply] }>()

const contactName = computed(() => props.scenario.contact?.name ?? 'Contact')
// Everything up to the current round's decision (earlier rounds, replies and reactions included)
const messages = computed(() => threadBefore(props.scenario, props.round, props.history))
const options = computed(() => props.scenario.rounds?.[props.round]?.options ?? [])
const firstIncoming = computed(() =>
  props.scenario.rounds?.[0]?.messages.find((m) => m.sender === 'them'),
)
const selectedText = computed(
  () => options.value.find((o) => o.id === props.selectedId)?.text ?? '',
)

// --- Playback ---------------------------------------------------------------
// phase: 'locked' (lock screen) -> 'playing' (messages arriving)
//        -> 'ready' (user replies) -> 'sent' (reply delivered)
//        -> 'done' once `round` moves past the last round and its reaction has played
type Phase = 'locked' | 'playing' | 'ready' | 'sent' | 'done'
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

// Plays the messages after the ones already visible
async function play() {
  const id = ++runId
  const alive = () => id === runId
  phase.value = 'playing'

  if (reducedMotion()) {
    visibleCount.value = messages.value.length
    void playReceive()
    becomeReady()
    return
  }

  await wait(450)
  for (const msg of messages.value.slice(visibleCount.value)) {
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
  if (!props.scenario.rounds?.[props.round]) {
    phase.value = 'done'
    return
  }
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
    visibleCount.value = 0
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

// Next round: the sent reply joins the thread, then the reaction and new messages play
watch(
  () => props.round,
  (next, prev) => {
    if (next <= prev) return
    const shown = visibleCount.value + (sentText.value ? 1 : 0)
    sentText.value = ''
    draft.value = ''
    visibleCount.value = shown
    void play()
  },
)

onMounted(start)
watch(() => props.scenario.id, start)
onBeforeUnmount(() => runId++)

// --- Phone size ----------------------------------------------------------------
// Scale the phone to the height of its column; on small screens it fills the screen instead.
const PHONE_HEIGHT = 830 // the device's drawn height including its rim
const phoneCol = ref<HTMLElement | null>(null)
const phoneScale = ref(1)
let resizeObserver: ResizeObserver | undefined
onMounted(() => {
  const narrow = window.matchMedia('(max-width: 860px)')
  const fit = () => {
    const height = phoneCol.value?.clientHeight ?? PHONE_HEIGHT
    phoneScale.value = narrow.matches ? 1 : Math.min(1, Math.max(0.55, height / PHONE_HEIGHT))
  }
  resizeObserver = new ResizeObserver(fit)
  if (phoneCol.value) resizeObserver.observe(phoneCol.value)
  narrow.addEventListener('change', fit)
  fit()
})
onBeforeUnmount(() => resizeObserver?.disconnect())

const placeholder = computed(() => {
  if (phase.value === 'sent') return props.sentPlaceholder
  if (props.mode === 'write') return phase.value === 'ready' ? 'Write your reply' : 'Text Message'
  return phase.value === 'ready' ? 'Choose a reply below' : 'Text Message'
})
</script>

<template>
  <div class="page">
    <ScenarioHeader
      class="brief"
      :title="scenario.title"
      :category="scenario.category"
      :tone="scenario.tone"
      :context="scenario.context"
    />

    <div ref="phoneCol" class="phone-col">
      <PhoneFrame
        class="phone"
        :style="{ zoom: phoneScale }"
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
                v-if="options.length"
                :options="options"
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

    <div class="aside">
      <slot name="feedback" />
    </div>
  </div>
</template>

<style scoped>
/* brief | phone | feedback across the full width, as tall as the parent allows */
.page {
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  gap: 40px;
}
.brief,
.phone-col,
.aside {
  min-height: 0;
}
.phone-col {
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.phone {
  width: 400px;
  flex-shrink: 0;
}
/* the feedback can be longer than the screen, so its column scrolls on its own */
.aside {
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 0 4px 32px 0;
  /* fade the bottom edge so it is clear there is more to scroll */
  mask-image: linear-gradient(to bottom, #000 calc(100% - 32px), transparent);
}

/* room for the home indicator when nothing sits under the input bar */
.home-space { padding-bottom: 30px; }

.keyboard-enter-active { transition: transform 0.42s cubic-bezier(0.2, 0.85, 0.25, 1); }
.keyboard-leave-active { transition: transform 0.3s cubic-bezier(0.5, 0, 0.75, 0); }
.keyboard-enter-from,
.keyboard-leave-to { transform: translateY(100%); }

.unlock-leave-active { transition: transform 0.45s cubic-bezier(0.5, 0, 0.75, 0), opacity 0.45s; }
.unlock-leave-to { transform: translateY(-100%); opacity: 0.6; }

@media (max-width: 860px) {
  /* stacked: brief, then phone, then the feedback, and the page scrolls */
  .page {
    height: auto;
    grid-template-columns: 1fr;
    gap: 20px;
  }
  .phone { width: 100%; }
  .aside { overflow: visible; padding: 0; mask-image: none; }
  .home-space { padding-bottom: 12px; }
}
</style>
