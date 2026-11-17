<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import {
  CATEGORIES,
  LIMITS,
  emptyMessage,
  emptyOption,
  emptyRound,
  newDraft,
  toDraft,
  toScenario,
  validateDraft,
  type DraftRound,
} from '@/data/scenarioDraft'
import { createScenario, updateScenario } from '@/data/scenarios'
import type { Scenario } from '@/types/scenario'

const props = defineProps<{
  scenario: Scenario | null
  suggestedId: string
  suggestedOrder: number
}>()

const emit = defineEmits<{
  saved: [id: string, title: string, created: boolean]
  cancel: []
}>()

const draft = ref(props.scenario ? toDraft(props.scenario) : newDraft(props.suggestedOrder))
const isNew = computed(() => props.scenario === null)

const submitted = ref(false)
const saving = ref(false)
const saveError = ref('')

const errors = computed(() => (submitted.value ? validateDraft(draft.value) : {}))
const errorCount = computed(() => Object.keys(errors.value).length)

const fieldId = (path: string) => `f-${path.replaceAll('.', '-')}`
const errorId = (path: string) => `${fieldId(path)}-error`
const invalid = (path: string) =>
  errors.value[path] ? { 'aria-invalid': 'true' as const, 'aria-describedby': errorId(path) } : {}

async function save() {
  submitted.value = true
  saveError.value = ''
  const problems = validateDraft(draft.value)
  const first = Object.keys(problems)[0]
  if (first) {
    await nextTick()
    const target =
      document.getElementById(fieldId(first)) ?? document.getElementById('editor-errors')
    target?.focus()
    return
  }

  saving.value = true
  try {
    const data = toScenario(draft.value)
    if (isNew.value) {
      const id = await createScenario(props.suggestedId, data)
      emit('saved', id, data.title, true)
    } else {
      await updateScenario(draft.value.id!, data)
      emit('saved', draft.value.id!, data.title, false)
    }
  } catch (err) {
    console.error('Saving the scenario failed:', err)
    saveError.value = "Couldn't save the scenario. Check your connection and try again."
  } finally {
    saving.value = false
  }
}

function addRound() {
  if (draft.value.rounds.length < LIMITS.rounds) draft.value.rounds.push(emptyRound())
}
function removeRound(ri: number) {
  draft.value.rounds.splice(ri, 1)
}
function moveRound(ri: number, by: -1 | 1) {
  const rounds = draft.value.rounds
  const [round] = rounds.splice(ri, 1)
  rounds.splice(ri + by, 0, round!)
}
function addMessage(round: DraftRound) {
  if (round.messages.length < LIMITS.messages) {
    const last = round.messages.at(-1)?.sender
    round.messages.push(emptyMessage(last === 'them' ? 'me' : 'them'))
  }
}
function addOption(round: DraftRound) {
  if (round.options.length < LIMITS.options) round.options.push(emptyOption())
}
function removeOption(round: DraftRound, oi: number) {
  const [removed] = round.options.splice(oi, 1)
  if (removed && round.correctKey === removed.key) round.correctKey = null
}

const LETTER = (i: number) => String.fromCharCode(65 + i)
</script>

<template>
  <form class="editor" novalidate @submit.prevent="save">
    <header class="editor-head">
      <h3>{{ isNew ? 'Add a scenario' : `Edit “${scenario!.title}”` }}</h3>
      <span class="id">{{ isNew ? suggestedId : draft.id }}</span>
    </header>
    <p class="required-note">Fields marked <span class="req">*</span> are required.</p>

    <div v-if="errorCount" id="editor-errors" class="alert alert-error" role="alert" tabindex="-1">
      {{ errorCount === 1 ? '1 field needs' : `${errorCount} fields need` }} attention before this
      scenario can be saved.
    </div>

    <fieldset class="group">
      <legend>Details</legend>
      <div class="grid">
        <div class="field wide">
          <label :for="fieldId('title')">Title <span class="req" aria-hidden="true">*</span></label>
          <input
            :id="fieldId('title')"
            v-model="draft.title"
            type="text"
            :maxlength="LIMITS.title"
            v-bind="invalid('title')"
          />
          <small v-if="errors.title" :id="errorId('title')" class="err">{{ errors.title }}</small>
        </div>

        <div class="field">
          <label :for="fieldId('category')"
            >Category <span class="req" aria-hidden="true">*</span></label
          >
          <select :id="fieldId('category')" v-model="draft.category" v-bind="invalid('category')">
            <option value="" disabled>Choose…</option>
            <option v-for="c in CATEGORIES" :key="c" :value="c">
              {{ c[0]!.toUpperCase() + c.slice(1) }}
            </option>
          </select>
          <small v-if="errors.category" :id="errorId('category')" class="err">
            {{ errors.category }}
          </small>
        </div>

        <div class="field">
          <label :for="fieldId('order')">Order <span class="req" aria-hidden="true">*</span></label>
          <input
            :id="fieldId('order')"
            v-model.number="draft.order"
            type="number"
            min="0"
            step="1"
            v-bind="invalid('order')"
          />
          <small v-if="errors.order" :id="errorId('order')" class="err">{{ errors.order }}</small>
          <small v-else class="hint">Lower numbers come first in the scenario list.</small>
        </div>

        <div class="field wide">
          <label :for="fieldId('tone')"
            >Tone to aim for <span class="req" aria-hidden="true">*</span></label
          >
          <input
            :id="fieldId('tone')"
            v-model="draft.tone"
            type="text"
            :maxlength="LIMITS.tone"
            placeholder="e.g. Polite and professional"
            v-bind="invalid('tone')"
          />
          <small v-if="errors.tone" :id="errorId('tone')" class="err">{{ errors.tone }}</small>
        </div>

        <div class="field wide">
          <label :for="fieldId('context')"
            >Context <span class="req" aria-hidden="true">*</span></label
          >
          <textarea
            :id="fieldId('context')"
            v-model="draft.context"
            rows="3"
            :maxlength="LIMITS.context"
            placeholder="The background the member reads before the conversation starts"
            v-bind="invalid('context')"
          ></textarea>
          <small v-if="errors.context" :id="errorId('context')" class="err">
            {{ errors.context }}
          </small>
        </div>

        <div class="field">
          <label :for="fieldId('contactName')"
            >Contact name <span class="req" aria-hidden="true">*</span></label
          >
          <input
            :id="fieldId('contactName')"
            v-model="draft.contactName"
            type="text"
            :maxlength="LIMITS.name"
            v-bind="invalid('contactName')"
          />
          <small v-if="errors.contactName" :id="errorId('contactName')" class="err">
            {{ errors.contactName }}
          </small>
        </div>

        <div class="field">
          <label :for="fieldId('contactRole')">Contact role</label>
          <input
            :id="fieldId('contactRole')"
            v-model="draft.contactRole"
            type="text"
            :maxlength="LIMITS.name"
            placeholder="e.g. Manager (optional)"
            v-bind="invalid('contactRole')"
          />
          <small v-if="errors.contactRole" :id="errorId('contactRole')" class="err">
            {{ errors.contactRole }}
          </small>
        </div>
      </div>
    </fieldset>

    <fieldset v-for="(round, ri) in draft.rounds" :key="round.key" class="group round">
      <legend>Round {{ ri + 1 }}</legend>
      <div class="round-tools">
        <button
          type="button"
          class="link"
          :disabled="ri === 0"
          :aria-label="`Move round ${ri + 1} up`"
          @click="moveRound(ri, -1)"
        >
          ↑
        </button>
        <button
          type="button"
          class="link"
          :disabled="ri === draft.rounds.length - 1"
          :aria-label="`Move round ${ri + 1} down`"
          @click="moveRound(ri, 1)"
        >
          ↓
        </button>
        <button
          v-if="draft.rounds.length > 1"
          type="button"
          class="link danger"
          @click="removeRound(ri)"
        >
          Remove round {{ ri + 1 }}
        </button>
      </div>

      <h4>Messages</h4>
      <p class="hint">Played in order. The last one must be from the contact.</p>
      <ol class="messages">
        <li v-for="(m, mi) in round.messages" :key="m.key" class="message">
          <select
            v-model="m.sender"
            :aria-label="`Round ${ri + 1}, message ${mi + 1} sender`"
            class="sender"
          >
            <option value="them">{{ draft.contactName.trim() || 'Contact' }}</option>
            <option value="me">Member</option>
          </select>
          <div class="message-text">
            <textarea
              :id="fieldId(`rounds.${ri}.messages.${mi}.text`)"
              v-model="m.text"
              rows="2"
              :maxlength="LIMITS.text"
              :aria-label="`Round ${ri + 1}, message ${mi + 1} text`"
              v-bind="invalid(`rounds.${ri}.messages.${mi}.text`)"
            ></textarea>
            <small
              v-if="errors[`rounds.${ri}.messages.${mi}.text`]"
              :id="errorId(`rounds.${ri}.messages.${mi}.text`)"
              class="err"
            >
              {{ errors[`rounds.${ri}.messages.${mi}.text`] }}
            </small>
          </div>
          <div v-if="ri === 0 && mi === 0" class="time">
            <input
              :id="fieldId(`rounds.${ri}.messages.${mi}.time`)"
              v-model="m.time"
              type="text"
              placeholder="10:42 AM"
              aria-label="Time of the first message (optional)"
              v-bind="invalid(`rounds.${ri}.messages.${mi}.time`)"
            />
            <small
              v-if="errors[`rounds.${ri}.messages.${mi}.time`]"
              :id="errorId(`rounds.${ri}.messages.${mi}.time`)"
              class="err"
            >
              {{ errors[`rounds.${ri}.messages.${mi}.time`] }}
            </small>
          </div>
          <button
            v-if="round.messages.length > 1"
            type="button"
            class="link danger"
            :aria-label="`Remove round ${ri + 1}, message ${mi + 1}`"
            @click="round.messages.splice(mi, 1)"
          >
            Remove
          </button>
        </li>
      </ol>
      <small v-if="errors[`rounds.${ri}.messages`]" class="err block">
        {{ errors[`rounds.${ri}.messages`] }}
      </small>
      <button
        type="button"
        class="btn btn-secondary btn-small"
        :disabled="round.messages.length >= LIMITS.messages"
        @click="addMessage(round)"
      >
        Add message
      </button>

      <h4>Suggested replies</h4>
      <p class="hint">
        Shown in “Pick a reply” mode. Mark the best one; it's used for grading and never shown.
      </p>
      <ol class="options">
        <li v-for="(o, oi) in round.options" :key="o.key" class="option">
          <label class="best">
            <input
              v-model="round.correctKey"
              type="radio"
              :name="`correct-${round.key}`"
              :value="o.key"
              :aria-label="`Round ${ri + 1}, reply ${LETTER(oi)} is the best reply`"
            />
            <span>{{ LETTER(oi) }}</span>
          </label>
          <div class="option-fields">
            <input
              :id="fieldId(`rounds.${ri}.options.${oi}.text`)"
              v-model="o.text"
              type="text"
              :maxlength="LIMITS.text"
              placeholder="The reply the member can send"
              :aria-label="`Round ${ri + 1}, reply ${LETTER(oi)} text`"
              v-bind="invalid(`rounds.${ri}.options.${oi}.text`)"
            />
            <small
              v-if="errors[`rounds.${ri}.options.${oi}.text`]"
              :id="errorId(`rounds.${ri}.options.${oi}.text`)"
              class="err"
            >
              {{ errors[`rounds.${ri}.options.${oi}.text`] }}
            </small>
            <input
              :id="fieldId(`rounds.${ri}.options.${oi}.reaction`)"
              v-model="o.reaction"
              type="text"
              :maxlength="LIMITS.text"
              placeholder="How the contact reacts to it"
              :aria-label="`Round ${ri + 1}, reply ${LETTER(oi)} reaction`"
              v-bind="invalid(`rounds.${ri}.options.${oi}.reaction`)"
            />
            <small
              v-if="errors[`rounds.${ri}.options.${oi}.reaction`]"
              :id="errorId(`rounds.${ri}.options.${oi}.reaction`)"
              class="err"
            >
              {{ errors[`rounds.${ri}.options.${oi}.reaction`] }}
            </small>
          </div>
          <button
            v-if="round.options.length > 2"
            type="button"
            class="link danger"
            :aria-label="`Remove round ${ri + 1}, reply ${LETTER(oi)}`"
            @click="removeOption(round, oi)"
          >
            Remove
          </button>
        </li>
      </ol>
      <small v-if="errors[`rounds.${ri}.options`]" class="err block">
        {{ errors[`rounds.${ri}.options`] }}
      </small>
      <small v-if="errors[`rounds.${ri}.correct`]" class="err block">
        {{ errors[`rounds.${ri}.correct`] }}
      </small>
      <button
        type="button"
        class="btn btn-secondary btn-small"
        :disabled="round.options.length >= LIMITS.options"
        @click="addOption(round)"
      >
        Add reply
      </button>
    </fieldset>

    <button
      type="button"
      class="btn btn-secondary add-round"
      :disabled="draft.rounds.length >= LIMITS.rounds"
      @click="addRound"
    >
      Add round
    </button>

    <p v-if="saveError" class="alert alert-error" role="alert">{{ saveError }}</p>
    <div class="actions">
      <button type="submit" class="btn" :disabled="saving">
        {{ saving ? 'Saving…' : isNew ? 'Save scenario' : 'Save changes' }}
      </button>
      <button type="button" class="btn btn-secondary" :disabled="saving" @click="emit('cancel')">
        Cancel
      </button>
    </div>
  </form>
</template>

<style scoped>
.editor {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 18px;
}
.editor-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}
h3 {
  margin: 0;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.02em;
}
h4 {
  margin: 14px 0 0;
  font-size: 15px;
  font-weight: 600;
}
.id {
  font-size: 13px;
  color: var(--muted);
  font-variant-numeric: tabular-nums;
}
.required-note {
  margin: -10px 0 0;
  font-size: 14px;
  color: var(--muted);
}
.req {
  color: var(--bad);
}
.group {
  margin: 0;
  padding: 16px 18px 18px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
}
legend {
  padding: 0 6px;
  font-size: 14px;
  font-weight: 600;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px 16px;
}
.grid .wide {
  grid-column: 1 / -1;
}
.grid .field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--muted);
}
input[type='text'],
input[type='number'],
select,
textarea {
  width: 100%;
  padding: 8px 10px;
  font: inherit;
  font-size: 15px;
  color: var(--navy);
  background: var(--white);
  border: 1px solid rgba(43, 53, 65, 0.22);
  border-radius: 10px;
  box-sizing: border-box;
}
textarea {
  resize: vertical;
}
input[aria-invalid='true'],
select[aria-invalid='true'],
textarea[aria-invalid='true'] {
  border-color: var(--bad);
  background: #fffafa;
}
.err {
  font-size: 13px;
  font-weight: 500;
  color: var(--bad);
}
.err.block {
  display: block;
  margin-top: 6px;
}
.hint {
  margin: 2px 0 8px;
  font-size: 13px;
  font-weight: 400;
  color: var(--muted);
}
.round {
  position: relative;
}
.round-tools {
  position: absolute;
  top: -4px;
  right: 14px;
  display: flex;
  gap: 10px;
  background: var(--white);
  padding: 0 6px;
}
.messages,
.options {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin: 0 0 10px;
  padding: 0;
  list-style: none;
}
.message,
.option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}
.sender {
  width: 130px;
  flex: none;
}
.message-text,
.option-fields {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.time {
  width: 110px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.best {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 8px;
  font-weight: 600;
}
.link {
  padding: 6px 2px;
  font: inherit;
  font-size: 14px;
  color: var(--navy);
  background: none;
  border: 0;
  text-decoration: underline;
  cursor: pointer;
}
.link:disabled {
  opacity: 0.35;
  cursor: default;
}
.link.danger {
  color: var(--bad);
}
.btn-small {
  align-self: flex-start;
  padding: 7px 14px;
  font-size: 14px;
}
.add-round {
  align-self: flex-start;
}
.actions {
  display: flex;
  gap: 10px;
}
@media (max-width: 640px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .message,
  .option {
    flex-wrap: wrap;
  }
  .round-tools {
    position: static;
    padding: 0;
  }
}
</style>
