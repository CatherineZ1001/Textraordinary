<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { toAuthMessage } from '@/auth/errors'

const router = useRouter()
const { user, logout } = useAuth()
const error = ref<string | null>(null)

const providerNames: Record<string, string> = {
  password: 'Email and password',
  'google.com': 'Google',
}

const provider = computed(() => {
  const id = user.value?.providerData[0]?.providerId
  return id ? (providerNames[id] ?? id) : 'Unknown'
})

const memberSince = computed(() => {
  const created = user.value?.metadata.creationTime
  return created ? new Date(created).toLocaleDateString() : 'Unknown'
})

async function signOut() {
  error.value = null
  try {
    await logout()
    await router.push({ name: 'login' })
  } catch (err) {
    error.value = toAuthMessage(err)
  }
}
</script>

<template>
  <main v-if="user" class="auth-card">
    <h1>Your profile</h1>
    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    <dl>
      <dt>Name</dt>
      <dd>{{ user.displayName || '—' }}</dd>
      <dt>Email</dt>
      <dd>{{ user.email }}</dd>
      <dt>Sign-in method</dt>
      <dd>{{ provider }}</dd>
      <dt>Member since</dt>
      <dd>{{ memberSince }}</dd>
    </dl>
    <button class="btn btn-secondary" type="button" @click="signOut">Sign out</button>
  </main>
</template>

<style scoped>
dl {
  margin-bottom: 1.5rem;
}

dt {
  font-size: 0.8rem;
  opacity: 0.7;
}

dd {
  margin: 0 0 0.75rem;
  color: var(--color-heading);
}
</style>
