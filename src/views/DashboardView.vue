<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '@/auth/useAuth'

const { user } = useAuth()
const name = computed(() => user.value?.displayName || user.value?.email || 'there')
</script>

<template>
  <main class="auth-card">
    <h1>Welcome, {{ name }}!</h1>
    <p>This is your member dashboard. Texting scenarios and feedback will appear here.</p>
  </main>
</template>
