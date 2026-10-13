<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'

// An iPhone-style device: bezel, Dynamic Island, status bar, home indicator.
// Put the screen content in the default slot.
// statusTone: 'dark' for dark icons (light screens), 'light' for white icons.
// screenOff hides the status bar and home indicator (phone asleep).
withDefaults(
  defineProps<{
    statusTone?: 'dark' | 'light'
    screenOff?: boolean
  }>(),
  { statusTone: 'dark', screenOff: false },
)

const time = ref('')
const tick = () => {
  const d = new Date()
  time.value = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`
}
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tick()
  timer = setInterval(tick, 15000)
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="device">
    <div class="screen">
      <div class="status-bar" :class="[statusTone, { off: screenOff }]" aria-hidden="true">
        <span class="time">{{ time }}</span>
        <span class="island"></span>
        <span class="icons">
          <!-- signal -->
          <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
          <!-- wifi -->
          <svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 2.3c2.3 0 4.4.9 6 2.4l1.1-1.1A10 10 0 0 0 8 .7 10 10 0 0 0 .9 3.6L2 4.7a8.5 8.5 0 0 1 6-2.4Zm0 3.2c1.4 0 2.7.5 3.7 1.4l1.1-1.1A7 7 0 0 0 8 3.9 7 7 0 0 0 3.2 5.8l1.1 1.1c1-.9 2.3-1.4 3.7-1.4Zm0 3.2c.6 0 1.1.2 1.5.6L8 10.8 6.5 9.3c.4-.4.9-.6 1.5-.6Z"/></svg>
          <!-- battery -->
          <svg width="27" height="13" viewBox="0 0 27 13"><rect x="0.5" y="0.5" width="22" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="16" height="9" rx="2"/><path d="M24.5 4.5v4a2 2 0 0 0 0-4Z" opacity=".4"/></svg>
        </span>
      </div>

      <slot />

      <div class="home-indicator" :class="[statusTone, { off: screenOff }]" aria-hidden="true"></div>
    </div>
  </div>
</template>

<style scoped>
.device {
  width: 100%;
  height: 820px;
  padding: 11px;
  background: #0d0e10;
  border-radius: 60px;
  /* thin metal rim + soft shadow on the desk */
  box-shadow:
    0 0 0 2px #4b4f56,
    0 0 0 3px #1d1f23,
    0 40px 70px -35px rgba(23, 32, 42, 0.6);
}
.screen {
  position: relative;
  height: 100%;
  border-radius: 49px;
  overflow: hidden;
  background: var(--screen);
  display: flex;
  flex-direction: column;
  font-family: var(--font-ios);
}

.status-bar {
  position: absolute;
  inset: 0 0 auto 0;
  z-index: 30;
  height: 54px;
  padding: 0 30px 0 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  pointer-events: none;
  transition: color 0.3s, opacity 0.6s;
}
.status-bar.off,
.home-indicator.off { opacity: 0; }
.status-bar.dark { color: #000; }
.status-bar.light { color: #fff; }
.time { font-size: 16px; font-weight: 600; letter-spacing: -0.01em; width: 54px; }
.icons { display: flex; gap: 6px; align-items: center; fill: currentColor; }
.island {
  position: absolute;
  left: 50%;
  top: 11px;
  transform: translateX(-50%);
  width: 122px;
  height: 35px;
  border-radius: 20px;
  background: #000;
}

.home-indicator {
  position: absolute;
  z-index: 30;
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: 134px;
  height: 5px;
  border-radius: 3px;
  pointer-events: none;
  transition: background 0.3s, opacity 0.6s;
}
.home-indicator.dark { background: #000; }
.home-indicator.light { background: rgba(255, 255, 255, 0.9); }

/* On an actual phone, drop the fake hardware and fill the screen */
@media (max-width: 860px) {
  .device {
    height: calc(100dvh - 32px);
    min-height: 600px;
    padding: 0;
    border-radius: 22px;
    background: none;
    box-shadow: 0 20px 40px -24px rgba(23, 32, 42, 0.5);
  }
  .screen { border-radius: 22px; }
  .status-bar, .home-indicator { display: none; }
}
</style>
