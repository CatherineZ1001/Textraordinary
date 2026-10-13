<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import { unlockAudio, playNotification } from '@/audio/messageSounds'

// iPhone lock screen, in two steps:
//   1. Asleep: a dark screen. The user clicks to wake it. That click is what
//      lets the browser play sound (browsers block sound before any click).
//   2. Awake: the wallpaper fades in, then the notification drops in with
//      the notification sound. Clicking it emits 'open'.
withDefaults(defineProps<{ contactName: string; preview?: string }>(), { preview: '' })
const emit = defineEmits<{ wake: []; open: [] }>()

const awake = ref(false)
const notified = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const now = new Date()
const date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
const time = `${now.getHours() % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`

function onClick() {
  if (!awake.value) {
    unlockAudio() // must happen inside the click
    awake.value = true
    emit('wake')
    timer = setTimeout(() => {
      notified.value = true
      void playNotification()
    }, 900)
  } else if (notified.value) {
    emit('open')
  }
}

onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <button
    type="button"
    class="lock"
    :class="{ awake }"
    :aria-label="!awake ? 'Wake the phone' : notified ? `Open message from ${contactName}` : 'Phone waking up'"
    @click="onClick"
  >
    <span class="clock">
      <span class="date">{{ date }}</span>
      <span class="time">{{ time }}</span>
    </span>

    <span v-if="notified" class="notification">
      <span class="app-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="20" height="20"><path fill="#fff" d="M12 3.5c-5 0-9 3.3-9 7.4 0 2.3 1.3 4.4 3.3 5.8-.1 1.2-.7 2.5-1.7 3.4 2 .1 3.8-.6 5-1.6.8.2 1.6.3 2.4.3 5 0 9-3.3 9-7.4S17 3.5 12 3.5Z"/></svg>
      </span>
      <span class="body">
        <span class="top">
          <strong>{{ contactName }}</strong>
          <span class="when">now</span>
        </span>
        <span class="preview">{{ preview }}</span>
      </span>
    </span>

    <span class="hint" :class="{ show: notified }">Tap the notification to open</span>

    <!-- the "screen off" layer; fades away when the phone wakes -->
    <span class="sleep" aria-hidden="true">
      <span class="wake-hint">Click to wake the phone</span>
    </span>
  </button>
</template>

<style scoped>
.lock {
  position: absolute;
  inset: 0;
  z-index: 20;
  border: 0;
  padding: 92px 12px 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  font: inherit;
  color: #fff;
  cursor: pointer;
  text-align: left;
  background:
    radial-gradient(120% 70% at 20% 10%, #6b8fd6 0%, transparent 60%),
    radial-gradient(90% 60% at 90% 90%, #e3a6b8 0%, transparent 65%),
    linear-gradient(170deg, #22336b 0%, #4c5fa8 45%, #b78bb0 100%);
}
.lock:focus-visible { outline: 3px solid #fff; outline-offset: -8px; }

.sleep {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 64px;
  background: #000;
  transition: opacity 0.6s ease-out;
}
.awake .sleep { opacity: 0; pointer-events: none; }
.wake-hint {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.45);
  animation: breathe 2.4s ease-in-out infinite;
}
@keyframes breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

.clock { display: flex; flex-direction: column; align-items: center; margin-bottom: auto; }
.date { font-size: 19px; font-weight: 500; opacity: 0.9; }
.time {
  font-size: 92px;
  font-weight: 600;
  line-height: 1;
  letter-spacing: -0.03em;
  margin-top: 2px;
}

.notification {
  width: 100%;
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  border-radius: 22px;
  color: #000;
  background: rgba(245, 245, 247, 0.72);
  backdrop-filter: blur(24px) saturate(1.6);
  -webkit-backdrop-filter: blur(24px) saturate(1.6);
  animation: drop-in 0.55s cubic-bezier(0.2, 0.9, 0.3, 1.15) both;
}
.lock:hover .notification { background: rgba(255, 255, 255, 0.82); }
.app-icon {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 9px;
  display: grid;
  place-items: center;
  background: linear-gradient(#5df270, #29c13d);
}
.body { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.top { display: flex; justify-content: space-between; align-items: baseline; }
.top strong { font-size: 15px; font-weight: 600; }
.when { font-size: 13px; color: rgba(0, 0, 0, 0.5); }
.preview {
  font-size: 15px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hint {
  margin-top: 14px;
  font-size: 13px;
  opacity: 0;
  transition: opacity 0.4s 0.6s;
}
.hint.show { opacity: 0.75; }

@keyframes drop-in {
  from { opacity: 0; transform: translateY(-24px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
</style>
