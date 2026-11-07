<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import DailyChallengeCard from '@/components/daily/DailyChallengeCard.vue'
import { useAuth } from '@/auth/useAuth'

const { user } = useAuth()
const name = computed(() => user.value?.displayName || user.value?.email || 'there')
</script>

<template>
  <main class="dashboard">
    <h1>Welcome, {{ name }}!</h1>
    <p class="lede">
      This is your member dashboard. Every scenario you play is saved to your
      <RouterLink :to="{ name: 'history' }">practice history</RouterLink>.
    </p>
    <DailyChallengeCard />
  </main>
</template>

<style scoped>
.dashboard {
  max-width: 880px;
  margin: 48px auto;
  padding: 0 20px;
}
h1 {
  margin: 0;
  font-size: 36px;
  line-height: 1.1;
  font-weight: 500;
  letter-spacing: -0.025em;
}
.lede {
  margin: 10px 0 28px;
  color: var(--muted);
}
</style>
