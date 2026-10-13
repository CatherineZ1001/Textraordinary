<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { toAuthMessage } from '@/auth/errors'
import { safeRedirect } from '@/router'

const route = useRoute()
const router = useRouter()
const { loginWithEmail, loginWithGoogle } = useAuth()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

const expired = computed(() => route.query.expired === '1')

async function attempt(signIn: () => Promise<void>) {
  error.value = null
  pending.value = true
  try {
    await signIn()
    await router.replace(safeRedirect(route.query.redirect))
  } catch (err) {
    error.value = toAuthMessage(err)
  } finally {
    pending.value = false
  }
}

const submit = () => attempt(() => loginWithEmail(email.value.trim(), password.value))
const google = () => attempt(loginWithGoogle)
</script>

<template>
  <main class="auth-card">
    <h1>Sign in</h1>

    <p v-if="expired && !error" class="alert alert-info">
      Your session has expired. Please sign in again.
    </p>
    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>

    <form class="auth-form" @submit.prevent="submit">
      <label>
        Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Password
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <button class="btn" type="submit" :disabled="pending">
        {{ pending ? 'Signing in…' : 'Sign in' }}
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
      <RouterLink to="/forgot-password">Forgot password?</RouterLink>
      <RouterLink
        :to="{
          name: 'register',
          query: route.query.redirect ? { redirect: route.query.redirect } : {},
        }"
      >
        Create an account
      </RouterLink>
    </div>
  </main>
</template>
