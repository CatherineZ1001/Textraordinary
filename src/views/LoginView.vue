<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { EmailNotVerifiedError, LoginLockedError, toAuthMessage } from '@/auth/errors'
import { attemptsLeft, formatRemaining, lockedUntil } from '@/auth/loginThrottle'
import { safeRedirect } from '@/router'

const route = useRoute()
const router = useRouter()
const { loginWithEmail, loginWithGoogle, resendVerification } = useAuth()

const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const pending = ref(false)

const expired = computed(() => route.query.expired === '1')
const justVerified = computed(() => route.query.verified === '1')

const unverified = ref(false)
const resendState = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const resendError = ref('')

async function resend() {
  resendState.value = 'sending'
  resendError.value = ''
  try {
    await resendVerification(email.value.trim(), password.value)
    resendState.value = 'sent'
  } catch (err) {
    resendError.value = toAuthMessage(err) ?? ''
    resendState.value = 'error'
  }
}

const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

const lockEnds = computed(() => (email.value.trim() ? lockedUntil(email.value, now.value) : null))
const locked = computed(() => lockEnds.value !== null)
const remaining = computed(() =>
  lockEnds.value ? formatRemaining(lockEnds.value - now.value) : '',
)
const warnLeft = ref<number | null>(null)

const errorWasLock = ref(false)

function tick() {
  now.value = Date.now()
}
watch(
  locked,
  (isLocked) => {
    if (isLocked && !timer) {
      timer = setInterval(tick, 1000)
    } else if (!isLocked) {
      clearInterval(timer)
      timer = undefined
      if (errorWasLock.value) {
        error.value = null
        errorWasLock.value = false
      }
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => clearInterval(timer))

watch([email, password], () => {
  unverified.value = false
  resendState.value = 'idle'
  warnLeft.value = null
  now.value = Date.now()
})

async function attempt(signIn: () => Promise<void>) {
  error.value = null
  errorWasLock.value = false
  unverified.value = false
  resendState.value = 'idle'
  warnLeft.value = null
  pending.value = true
  try {
    await signIn()
    await router.replace(safeRedirect(route.query.redirect))
  } catch (err) {
    if (err instanceof EmailNotVerifiedError) {
      unverified.value = true
    } else {
      error.value = toAuthMessage(err)
      errorWasLock.value = err instanceof LoginLockedError
      const left = attemptsLeft(email.value)
      if (!errorWasLock.value && left > 0 && left <= 2) {
        warnLeft.value = left
      }
    }
    now.value = Date.now()
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

    <p v-if="justVerified && !error && !unverified" class="alert alert-success" role="status">
      Your email is verified. Sign in to get started.
    </p>
    <p v-else-if="expired && !error" class="alert alert-info">
      Your session has expired. Please sign in again.
    </p>

    <p v-if="locked" class="alert alert-error" role="alert">
      Too many failed sign-in attempts for this email. For your security, sign-in is paused. Try
      again in <strong>{{ remaining }}</strong
      >, or <RouterLink to="/forgot-password">reset your password</RouterLink>.
    </p>
    <p v-else-if="error" class="alert alert-error" role="alert">
      {{ error }}
      <template v-if="warnLeft">
        {{ warnLeft }} {{ warnLeft === 1 ? 'attempt' : 'attempts' }} left before sign-in is paused
        for a few minutes.
      </template>
    </p>

    <div v-if="unverified" class="alert alert-info" role="alert">
      <p class="verify-text">
        Please verify your email before signing in. We sent a link to
        <strong>{{ email.trim() }}</strong> when you signed up; check your inbox and spam folder.
      </p>
      <p v-if="resendState === 'sent'" class="verify-text" role="status">
        A new verification link is on its way.
      </p>
      <p v-else-if="resendState === 'error'" class="verify-text verify-error">{{ resendError }}</p>
      <button
        v-if="resendState !== 'sent'"
        type="button"
        class="btn btn-secondary btn-small"
        :disabled="resendState === 'sending'"
        @click="resend"
      >
        {{ resendState === 'sending' ? 'Sending…' : 'Resend verification email' }}
      </button>
    </div>

    <form class="auth-form" @submit.prevent="submit">
      <label>
        Email
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label>
        Password
        <input v-model="password" type="password" autocomplete="current-password" required />
      </label>
      <button class="btn" type="submit" :disabled="pending || locked">
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

<style scoped>
.verify-text {
  margin: 0 0 10px;
}
.verify-error {
  color: #8a2a23;
}
.btn-small {
  padding: 8px 16px;
  font-size: 14px;
}
</style>
