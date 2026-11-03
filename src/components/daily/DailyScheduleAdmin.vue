<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  listDailyChallenges,
  scheduleDailyChallenges,
  unscheduleDailyChallenge,
} from '@/data/daily'
import { listScenarios } from '@/data/scenarios'
import { pickScenarioForDate } from '@/data/rotation'
import { addDays, formatDateKey, isDateKey, localDateKey } from '@/data/dates'
import type { DailyChallenge } from '@/types/daily'
import type { Scenario } from '@/types/scenario'

// Admin page: the daily challenge schedule (PBI 13). Shows the next two weeks, lets an
// administrator set or clear any day, and fills a run of days at once from chosen scenarios.
// Days left unscheduled get the automatic pick from the scenario list, so there is always a
// challenge, but the page warns when tomorrow hasn't been scheduled on purpose.
const SHOWN_DAYS = 14
const MAX_DAYS = 365

const today = localDateKey()
const tomorrow = addDays(today, 1)

const scenarios = ref<Scenario[]>([])
const days = ref<DailyChallenge[]>([])
const loadState = ref<'loading' | 'ready' | 'error'>('loading')
const savingDate = ref<string | null>(null)
const rowError = ref('')

const titleOf = (id: string) => scenarios.value.find((s) => s.id === id)?.title ?? `Missing (${id})`
const autoPick = (date: string) =>
  scenarios.value.length ? pickScenarioForDate(date, scenarios.value).title : 'No scenarios'

async function load() {
  loadState.value = 'loading'
  try {
    const [all, upcoming] = await Promise.all([
      listScenarios(),
      listDailyChallenges(today, addDays(today, SHOWN_DAYS - 1)),
    ])
    scenarios.value = all
    days.value = upcoming
    loadState.value = 'ready'
  } catch (err) {
    console.error('Loading the daily challenge schedule failed:', err)
    loadState.value = 'error'
  }
}

const tomorrowScheduled = computed(() => days.value.find((d) => d.date === tomorrow)?.scheduled)

/** One day's dropdown: a scenario id, or '' to go back to the automatic pick */
async function setDay(date: string, scenarioId: string) {
  savingDate.value = date
  rowError.value = ''
  try {
    if (scenarioId) await scheduleDailyChallenges([{ date, scenarioId }])
    else await unscheduleDailyChallenge(date)
    await load()
  } catch (err) {
    console.error('Saving the daily challenge failed:', err)
    rowError.value = `Couldn't save ${formatDateKey(date)}. Try again.`
  } finally {
    savingDate.value = null
  }
}

// ---- Fill several days at once ---------------------------------------------
const bulk = reactive({
  start: tomorrow,
  count: 7,
  /** Chosen scenarios, used in turn, one per day */
  scenarioIds: [] as string[],
  skipScheduled: true,
})
const bulkState = ref<'idle' | 'saving' | 'done' | 'error'>('idle')
const bulkMessage = ref('')

const bulkProblem = computed(() => {
  if (!isDateKey(bulk.start) || bulk.start < today) return 'Pick a start date from today on.'
  if (!Number.isInteger(bulk.count) || bulk.count < 1 || bulk.count > MAX_DAYS) {
    return `Choose between 1 and ${MAX_DAYS} days.`
  }
  if (!bulk.scenarioIds.length) return 'Choose at least one scenario.'
  return ''
})

async function fillDays() {
  if (bulkProblem.value) return
  bulkState.value = 'saving'
  try {
    const end = addDays(bulk.start, bulk.count - 1)
    const existing = await listDailyChallenges(bulk.start, end)
    // keep the chosen scenarios in list order, so the rotation is predictable
    const chosen = scenarios.value.filter((s) => bulk.scenarioIds.includes(s.id))
    const entries = existing
      .filter((d) => !(bulk.skipScheduled && d.scheduled))
      .map((d, i) => ({ date: d.date, scenarioId: chosen[i % chosen.length]!.id }))
    await scheduleDailyChallenges(entries)
    const skipped = existing.length - entries.length
    bulkMessage.value =
      `Scheduled ${entries.length} ${entries.length === 1 ? 'day' : 'days'}` +
      ` (${formatDateKey(bulk.start)} to ${formatDateKey(end)})` +
      (skipped ? `, skipped ${skipped} already scheduled.` : '.')
    bulkState.value = 'done'
    await load()
  } catch (err) {
    console.error('Scheduling daily challenges failed:', err)
    bulkMessage.value = "Couldn't save the schedule. Try again."
    bulkState.value = 'error'
  }
}

onMounted(load)
</script>

<template>
  <section class="schedule" aria-labelledby="schedule-title">
    <h2 id="schedule-title">Daily challenge schedule</h2>
    <p class="lede">
      Every member gets the same scenario each day. Days you don't schedule use an automatic pick
      from the scenario list.
    </p>

    <p v-if="loadState === 'loading'" class="status">
      <span class="spinner"></span> Loading the schedule…
    </p>
    <div v-else-if="loadState === 'error'" class="status">
      <p class="alert alert-error">Couldn't load the schedule.</p>
      <button type="button" class="btn" @click="load">Try again</button>
    </div>

    <template v-else>
      <p v-if="!tomorrowScheduled" class="alert alert-warning" role="alert">
        <strong>Nothing is scheduled for tomorrow ({{ formatDateKey(tomorrow) }}).</strong>
        Members will get the automatic pick, “{{ autoPick(tomorrow) }}”, unless you choose one.
      </p>

      <h3>Next {{ SHOWN_DAYS }} days</h3>
      <p v-if="rowError" class="alert alert-error">{{ rowError }}</p>
      <table class="days">
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Scenario</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="day in days" :key="day.date">
            <th scope="row">
              {{ formatDateKey(day.date) }}
              <span v-if="day.date === today" class="when">Today</span>
              <span v-else-if="day.date === tomorrow" class="when">Tomorrow</span>
            </th>
            <td>
              <select
                :value="day.scheduled ? day.scenarioId : ''"
                :disabled="savingDate !== null"
                :aria-label="`Scenario for ${formatDateKey(day.date)}`"
                @change="setDay(day.date, ($event.target as HTMLSelectElement).value)"
              >
                <option value="">Automatic: {{ autoPick(day.date) }}</option>
                <option
                  v-if="day.scheduled && !scenarios.some((s) => s.id === day.scenarioId)"
                  :value="day.scenarioId"
                >
                  {{ titleOf(day.scenarioId) }}
                </option>
                <option v-for="s in scenarios" :key="s.id" :value="s.id">{{ s.title }}</option>
              </select>
            </td>
            <td class="state" :class="{ auto: !day.scheduled }">
              <span v-if="savingDate === day.date" class="spinner"></span>
              <template v-else>{{ day.scheduled ? 'Scheduled' : 'Automatic' }}</template>
            </td>
          </tr>
        </tbody>
      </table>

      <h3>Schedule several days</h3>
      <form class="bulk" @submit.prevent="fillDays">
        <div class="fields">
          <label>
            Starting
            <input v-model="bulk.start" type="date" :min="today" required />
          </label>
          <label>
            For the next
            <span class="count">
              <input v-model.number="bulk.count" type="number" min="1" :max="MAX_DAYS" required />
              days
            </span>
          </label>
        </div>

        <fieldset>
          <legend>Scenarios, used in turn, one per day</legend>
          <label v-for="s in scenarios" :key="s.id" class="choice">
            <input v-model="bulk.scenarioIds" type="checkbox" :value="s.id" />
            {{ s.title }}
          </label>
        </fieldset>

        <label class="choice">
          <input v-model="bulk.skipScheduled" type="checkbox" />
          Keep days that are already scheduled
        </label>

        <p v-if="bulkProblem && bulk.scenarioIds.length" class="hint">{{ bulkProblem }}</p>
        <button type="submit" class="btn" :disabled="!!bulkProblem || bulkState === 'saving'">
          {{ bulkState === 'saving' ? 'Scheduling…' : 'Schedule days' }}
        </button>
        <p
          v-if="bulkState === 'done' || bulkState === 'error'"
          class="alert"
          :class="bulkState === 'error' ? 'alert-error' : 'alert-success'"
          role="status"
        >
          {{ bulkMessage }}
        </p>
      </form>
    </template>
  </section>
</template>

<style scoped>
.schedule {
  padding: 28px 30px;
  border-radius: var(--radius-lg);
  background: var(--white);
  border: 1px solid var(--line);
}
h2 {
  margin: 0;
  font-size: 26px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
h3 {
  margin: 28px 0 10px;
  font-size: 18px;
  font-weight: 600;
}
.lede {
  margin: 6px 0 18px;
  color: var(--muted);
}
.status {
  color: var(--muted);
}
.alert-warning {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: #fdf3e1;
  border: 1px solid #f0d49a;
  color: #6b4505;
}

.days {
  width: 100%;
  border-collapse: collapse;
}
.days th,
.days td {
  padding: 8px 12px 8px 0;
  border-bottom: 1px solid var(--line);
  text-align: left;
  vertical-align: middle;
}
.days thead th {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--muted);
}
.days tbody th {
  font-weight: 600;
  white-space: nowrap;
}
.when {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 500;
  color: var(--muted);
}
select,
.bulk input[type='date'],
.bulk input[type='number'] {
  width: 100%;
  max-width: 420px;
  padding: 7px 10px;
  font: inherit;
  font-size: 15px;
  color: var(--navy);
  background: var(--white);
  border: 1px solid rgba(43, 53, 65, 0.22);
  border-radius: 10px;
}
.state {
  width: 90px;
  font-size: 14px;
  font-weight: 600;
}
.state.auto {
  font-weight: 400;
  color: var(--muted);
}

.bulk {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 14px;
}
.fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.fields label {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
}
.count {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--navy);
}
.bulk input[type='number'] {
  width: 90px;
}
fieldset {
  display: grid;
  gap: 6px;
  max-height: 240px;
  overflow-y: auto;
  margin: 0;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}
legend {
  padding: 0 6px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
}
.choice {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 15px;
}
.hint {
  margin: 0;
  font-size: 14px;
  color: var(--bad);
}

@media (max-width: 640px) {
  .schedule {
    padding: 20px 16px;
  }
  .state {
    display: none;
  }
}
</style>
