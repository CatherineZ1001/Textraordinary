<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { FirebaseError } from 'firebase/app'
import { useAuth } from '@/auth/useAuth'
import { toAuthMessage } from '@/auth/errors'

const { resetPassword } = useAuth()

const email = ref('')
const error = ref<string | null>(null)
const sent = ref(false)
const pending = ref(false)

async function submit() {
  error.value = null
  pending.value = true
  try {
    await resetPassword(email.value.trim())
    sent.value = true
  } catch (err) {
    // Show the same confirmation for unknown emails so the form does not reveal which accounts exist.
    if (err instanceof FirebaseError && err.code === 'auth/user-not-found') {
      sent.value = true
    } else {
      error.value = toAuthMessage(err)
    }
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <main class="auth-card">
    <h1>Reset password</h1>

    <p v-if="sent" class="alert alert-success" role="status">
      If an account exists for {{ email }}, a password reset link is on its way. Check your inbox
      and spam folder.
    </p>
    <template v-else>
      <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
      <form class="auth-form" @submit.prevent="submit">
        <label>
          Email
          <input v-model="email" type="email" autocomplete="email" required />
        </label>
        <button class="btn" type="submit" :disabled="pending">
          {{ pending ? 'Sending…' : 'Send reset link' }}
        </button>
      </form>
    </template>

    <div class="auth-links">
      <RouterLink to="/login">Back to sign in</RouterLink>
    </div>
  </main>
</template>
