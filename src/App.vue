<script setup lang="ts">
import { ref } from 'vue'
import { RouterView } from 'vue-router'
import AppNavBar from '@/components/AppNavBar.vue'
import IntroSplash from '@/components/brand/IntroSplash.vue'
import { useAuth } from '@/auth/useAuth'

const { ready } = useAuth()

// Loading screen: plays once per browser tab (not on every reload) and stays
// up until the saved login has been checked.
const INTRO_KEY = 'textraordinary:intro-seen'

function introSeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1'
  } catch {
    return false
  }
}

const showIntro = ref(!introSeen())

function onIntroDone() {
  showIntro.value = false
  try {
    sessionStorage.setItem(INTRO_KEY, '1')
  } catch {
    // storage unavailable (private mode etc.); the intro will just play again next time
  }
}
</script>

<template>
  <AppNavBar />
  <RouterView v-if="ready" />
  <IntroSplash v-if="showIntro" :ready="ready" @done="onIntroDone" />
</template>
