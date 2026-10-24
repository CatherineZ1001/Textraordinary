<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { listScenarios } from '@/data/scenarios'
import type { Scenario } from '@/types/scenario'

// Scenario list (/practice). Each card opens the scenario at /practice/:id.
const scenarios = ref<Scenario[]>([])
const loadState = ref<'loading' | 'ready' | 'error'>('loading')
const loadError = ref('')

async function load() {
  loadState.value = 'loading'
  try {
    scenarios.value = await listScenarios()
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading scenarios failed:', err)
    loadError.value =
      err instanceof FirebaseError && err.code === 'permission-denied'
        ? 'Please sign in to see the scenarios.'
        : "Couldn't load the scenarios. Check your connection and try again."
    loadState.value = 'error'
  }
}

onMounted(load)
</script>

<template>
  <main class="scenarios">
    <h1>Pick a scenario</h1>

    <p v-if="loadState === 'loading'" class="status">Loading scenarios…</p>
    <div v-else-if="loadState === 'error'" class="status">
      <p class="alert alert-error">{{ loadError }}</p>
      <button type="button" class="btn btn-secondary" @click="load">Try again</button>
    </div>
    <p v-else-if="scenarios.length === 0" class="status">No scenarios yet.</p>

    <ul v-else class="grid">
      <li v-for="s in scenarios" :key="s.id">
        <RouterLink :to="{ name: 'practice', params: { id: s.id } }" class="card">
          <span class="category">{{ s.category }}</span>
          <h2>{{ s.title }}</h2>
          <p v-if="s.contact" class="contact">
            with {{ s.contact.name }}<template v-if="s.contact.role"> · {{ s.contact.role }}</template>
          </p>
          <p class="tone">Aim for: {{ s.tone }}</p>
        </RouterLink>
      </li>
    </ul>
  </main>
</template>

<style scoped>
.scenarios {
  max-width: 1000px;
  margin: 0 auto;
  padding: 32px 24px 64px;
}
h1 {
  margin: 0 0 24px;
  font-size: 28px;
}
.status {
  max-width: 420px;
  margin: 48px auto;
  text-align: center;
}
.grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}
/* each card is a small version of the scenario note */
.card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 100%;
  box-sizing: border-box;
  padding: 20px;
  background: var(--note);
  color: var(--ink);
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(23, 32, 42, 0.08), 0 10px 24px -18px rgba(23, 32, 42, 0.45);
  transition: transform 0.15s, box-shadow 0.15s;
}
.card:hover,
.card:focus-visible {
  background: var(--note);
  transform: translateY(-2px);
  box-shadow: 0 1px 0 rgba(23, 32, 42, 0.08), 0 16px 30px -18px rgba(23, 32, 42, 0.55);
}
.category {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--desk-ink);
}
h2 {
  margin: 0;
  font-size: 18px;
  line-height: 1.3;
}
.contact,
.tone {
  margin: 0;
  font-size: 14px;
  color: var(--desk-ink);
}
</style>
