<script setup lang="ts">
import { ref } from 'vue'
import ScenarioManager from '@/components/admin/ScenarioManager.vue'
import DailyScheduleAdmin from '@/components/daily/DailyScheduleAdmin.vue'

const scheduleKey = ref(0)
</script>

<template>
  <main class="admin">
    <h1>Manage scenarios</h1>
    <p class="lede">Administrators only.</p>
    <ScenarioManager @changed="scheduleKey++" />
    <DailyScheduleAdmin :key="scheduleKey" />
  </main>
</template>

<style scoped>
.admin {
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
