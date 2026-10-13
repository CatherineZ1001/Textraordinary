<script setup lang="ts">
import { computed } from 'vue'

// iOS Messages-style header: back chevron, avatar + name, video icon.
const props = withDefaults(defineProps<{ name: string; role?: string }>(), { role: '' })

const initials = computed(() =>
  props.name
    .split(' ')
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase(),
)
</script>

<template>
  <header class="nav">
    <span class="back" aria-hidden="true">
      <svg width="12" height="20" viewBox="0 0 12 20"><path d="M10 2 2 10l8 8" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
    </span>

    <span class="who">
      <span class="avatar" aria-hidden="true">{{ initials }}</span>
      <span class="name">
        {{ name }}
        <svg width="7" height="11" viewBox="0 0 7 11" aria-hidden="true"><path d="m1.5 1.5 4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </span>
      <span v-if="role" class="visually-hidden">, {{ role }}</span>
    </span>

    <span class="video" aria-hidden="true">
      <svg width="26" height="18" viewBox="0 0 26 18"><rect x="1" y="2" width="17" height="14" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m19.5 7 5-3.2v10.4l-5-3.2Z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>
    </span>
  </header>
</template>

<style scoped>
.nav {
  position: relative;
  z-index: 10;
  display: grid;
  grid-template-columns: 44px 1fr 44px;
  align-items: start;
  padding: 58px 10px 8px;
  background: var(--ios-bar);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 0.5px solid var(--ios-separator);
  color: var(--ios-blue);
}
.back, .video { display: grid; place-items: center; height: 54px; }
.who {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #000;
}
.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: linear-gradient(#a5abb6, #858b96);
  color: #fff;
  font-size: 21px;
  font-weight: 500;
  letter-spacing: 0.02em;
}
.name {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #000;
}
.name svg { color: var(--ios-secondary); }
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}

@media (max-width: 860px) {
  .nav { padding-top: 12px; }
}
</style>
