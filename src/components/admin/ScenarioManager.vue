<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import ScenarioEditor from './ScenarioEditor.vue'
import { deleteScenario, listScenarios, listUpcomingSchedule } from '@/data/scenarios'
import { CATEGORIES, matchesSearch, nextScenarioId } from '@/data/scenarioDraft'
import { formatDateKey, localDateKey } from '@/data/dates'
import type { Scenario, ScenarioCategory } from '@/types/scenario'

const emit = defineEmits<{ changed: [] }>()

const scenarios = ref<Scenario[]>([])
const loadState = ref<'loading' | 'ready' | 'error'>('loading')

const search = ref('')
const category = ref<ScenarioCategory | ''>('')

const editing = ref<Scenario | 'new' | null>(null)
const notice = ref('')

const confirming = ref<{ scenario: Scenario; dates: string[] } | null>(null)
const deleting = ref(false)
const deleteError = ref('')

async function load() {
  loadState.value = 'loading'
  try {
    scenarios.value = await listScenarios()
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading scenarios failed:', err)
    loadState.value = 'error'
  }
}

const results = computed(() =>
  scenarios.value.filter(
    (s) => (!category.value || s.category === category.value) && matchesSearch(s, search.value),
  ),
)
const nextId = computed(() => nextScenarioId(scenarios.value.map((s) => s.id)))
const nextOrder = computed(() =>
  scenarios.value.reduce((max, s) => Math.max(max, (s.order ?? 0) + 1), 1),
)

const label = (c: string) => c[0]!.toUpperCase() + c.slice(1)
const roundCount = (s: Scenario) => s.rounds?.length ?? 0

function startEditing(target: Scenario | 'new') {
  notice.value = ''
  confirming.value = null
  editing.value = target
}

async function onSaved(id: string, title: string, created: boolean) {
  editing.value = null
  notice.value = created ? `Added “${title}” (${id}).` : `Saved changes to “${title}”.`
  await load()
  emit('changed')
}

async function askDelete(s: Scenario) {
  notice.value = ''
  deleteError.value = ''
  try {
    const dates = await listUpcomingSchedule(s.id, localDateKey())
    confirming.value = { scenario: s, dates }
    await nextTick()
    document.getElementById('confirm-delete')?.focus()
  } catch (err) {
    console.error('Checking the schedule failed:', err)
    deleteError.value = "Couldn't check whether this scenario is scheduled. Try again."
  }
}

async function confirmDelete() {
  if (!confirming.value) return
  const { scenario, dates } = confirming.value
  deleting.value = true
  deleteError.value = ''
  try {
    await deleteScenario(scenario.id, dates)
    confirming.value = null
    notice.value = `Deleted “${scenario.title}”.`
    await load()
    emit('changed')
  } catch (err) {
    console.error('Deleting the scenario failed:', err)
    deleteError.value = "Couldn't delete the scenario. Try again."
  } finally {
    deleting.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>

<template>
  <section class="library" aria-labelledby="library-title">
    <h2 id="library-title">Scenarios</h2>

    <ScenarioEditor
      v-if="editing"
      :key="editing === 'new' ? 'new' : editing.id"
      :scenario="editing === 'new' ? null : editing"
      :suggested-id="nextId"
      :suggested-order="nextOrder"
      @saved="onSaved"
      @cancel="editing = null"
    />

    <template v-else>
      <p class="lede">
        Everything members can practice. Changes show up for members the next time they open a
        scenario.
      </p>

      <p v-if="notice" class="alert alert-success" role="status">{{ notice }}</p>

      <p v-if="loadState === 'loading'" class="status">
        <span class="spinner"></span> Loading scenarios…
      </p>
      <div v-else-if="loadState === 'error'" class="status">
        <p class="alert alert-error">Couldn't load the scenarios.</p>
        <button type="button" class="btn" @click="load">Try again</button>
      </div>

      <template v-else>
        <div class="toolbar">
          <input
            v-model="search"
            type="search"
            class="search"
            placeholder="Search by title, tone, context or contact"
            aria-label="Search scenarios"
          />
          <select v-model="category" aria-label="Filter by category">
            <option value="">All categories</option>
            <option v-for="c in CATEGORIES" :key="c" :value="c">{{ label(c) }}</option>
          </select>
          <button type="button" class="btn" @click="startEditing('new')">Add scenario</button>
        </div>

        <p class="count" aria-live="polite">
          {{
            results.length === scenarios.length
              ? `${scenarios.length} ${scenarios.length === 1 ? 'scenario' : 'scenarios'}`
              : `${results.length} of ${scenarios.length} scenarios match`
          }}
        </p>

        <p v-if="deleteError" class="alert alert-error" role="alert">{{ deleteError }}</p>

        <ul v-if="results.length" class="list">
          <li v-for="s in results" :key="s.id" class="item">
            <div class="summary">
              <span class="title">{{ s.title }}</span>
              <span class="meta">
                {{ s.id }} · {{ label(s.category) }} · {{ s.contact?.name ?? 'No contact' }} ·
                {{ roundCount(s) }} {{ roundCount(s) === 1 ? 'round' : 'rounds' }} · order
                {{ s.order }}
              </span>
            </div>
            <div class="item-actions">
              <button
                type="button"
                class="btn btn-secondary btn-small"
                :aria-label="`Edit ${s.title}`"
                @click="startEditing(s)"
              >
                Edit
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-small danger"
                :aria-label="`Delete ${s.title}`"
                @click="askDelete(s)"
              >
                Delete
              </button>
            </div>

            <div
              v-if="confirming?.scenario.id === s.id"
              class="confirm"
              role="group"
              :aria-label="`Confirm deleting ${s.title}`"
            >
              <p>
                <strong>Delete “{{ s.title }}”?</strong> This can't be undone. Members' saved
                history keeps its scores.
              </p>
              <p v-if="confirming.dates.length" class="warn">
                It's scheduled as the daily challenge on
                {{ confirming.dates.map((d) => formatDateKey(d)).join(', ') }}. Those days will
                switch to the automatic pick.
              </p>
              <div class="confirm-actions">
                <button
                  id="confirm-delete"
                  type="button"
                  class="btn danger-solid btn-small"
                  :disabled="deleting"
                  @click="confirmDelete"
                >
                  {{ deleting ? 'Deleting…' : 'Delete scenario' }}
                </button>
                <button
                  type="button"
                  class="btn btn-secondary btn-small"
                  :disabled="deleting"
                  @click="confirming = null"
                >
                  Keep it
                </button>
              </div>
            </div>
          </li>
        </ul>
        <p v-else class="empty">
          {{ scenarios.length ? 'No scenarios match your search.' : 'No scenarios yet.' }}
        </p>
      </template>
    </template>
  </section>
</template>

<style scoped>
.library {
  margin-bottom: 28px;
  padding: 28px 30px;
  border-radius: var(--radius-lg);
  background: var(--white);
  border: 1px solid var(--line);
}
h2 {
  margin: 0 0 6px;
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
.lede {
  margin: 0 0 18px;
  color: var(--muted);
}
.status {
  color: var(--muted);
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.search {
  flex: 1;
  min-width: 220px;
}
.toolbar input,
.toolbar select {
  padding: 9px 12px;
  font: inherit;
  font-size: 15px;
  color: var(--navy);
  background: var(--white);
  border: 1px solid rgba(43, 53, 65, 0.22);
  border-radius: 10px;
}
.count {
  margin: 12px 0 6px;
  font-size: 13px;
  color: var(--muted);
}
.list {
  margin: 0;
  padding: 0;
  list-style: none;
}
.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 0;
  border-bottom: 1px solid var(--line);
}
.summary {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.title {
  font-weight: 600;
}
.meta {
  font-size: 13px;
  color: var(--muted);
}
.item-actions {
  display: flex;
  gap: 8px;
}
.btn-small {
  padding: 7px 14px;
  font-size: 14px;
}
.danger {
  color: var(--bad);
}
.danger:hover {
  border-color: var(--bad);
}
.danger-solid {
  color: var(--white);
  background: var(--bad);
}
.danger-solid:hover {
  background: #a82b25;
}
.confirm {
  flex-basis: 100%;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: #fbecea;
  border: 1px solid #f1c4bf;
}
.confirm p {
  margin: 0 0 8px;
  font-size: 14px;
}
.confirm .warn {
  color: #6b4505;
}
.confirm-actions {
  display: flex;
  gap: 8px;
}
.empty {
  color: var(--muted);
}
@media (max-width: 640px) {
  .library {
    padding: 20px 16px;
  }
}
</style>
