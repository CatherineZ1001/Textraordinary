<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppNavBar from '@/components/AppNavBar.vue'
import { useAuth } from '@/auth/useAuth'

const { ready } = useAuth()
</script>

<template>
  <AppNavBar />
  <RouterView v-if="ready" />
</template>
