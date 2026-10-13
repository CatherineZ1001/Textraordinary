<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { toAuthMessage } from '@/auth/errors'
import { safeRedirect } from '@/router'

const route = useRoute()
const router = useRouter()
const { register, loginWithGoogle } = useAuth()

const displayName = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

async function attempt(signUp: () => Promise<void>) {
  error.value = null
  pending.value = true
  try {
    await signUp()
    await router.replace(safeRedirect(route.query.redirect))
  } catch (err) {
    error.value = toAuthMessage(err)
  } finally {
    pending.value = false
  }
}

function submit() {
  if (password.value.length < 6) {
    error.value = 'Password must be at least 6 characters.'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = 'Passwords do not match.'
    return
  }
  return attempt(() => register(email.value.trim(), password.value, displayName.value.trim()))
}

const google = () => attempt(loginWithGoogle)
</script>

<template>
  <main class="auth-card">
    <h1>Create an account</h1>

    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>

    <form class="auth-form" @submit.prevent="submit">
      <label>
        Display name
        <input v-model="displayName" type="text" autocomplete="nickname" />
      </label>
      <label>
        Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Password
        <input
          v-model="password"
          type="password"
          autocomplete="new-password"
          minlength="6"
          required
        />
      </label>
      <label>
        Confirm password
        <input v-model="confirmPassword" type="password" autocomplete="new-password" required />
      </label>
      <button class="btn" type="submit" :disabled="pending">
        {{ pending ? 'Creating account…' : 'Create account' }}
      </button>
    </form>

    <p class="auth-divider">or</p>
    <button
      class="btn btn-secondary"
      type="button"
      style="width: 100%"
      :disabled="pending"
      @click="google"
    >
      Continue with Google
    </button>

    <div class="auth-links">
      <span>Already have an account?</span>
      <RouterLink
        :to="{
          name: 'login',
          query: route.query.redirect ? { redirect: route.query.redirect } : {},
        }"
      >
        Sign in
      </RouterLink>
    </div>
  </main>
</template>
