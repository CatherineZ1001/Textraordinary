<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { toAuthMessage } from '@/auth/errors'

const router = useRouter()
const { user, ready, logout } = useAuth()

async function signOut() {
  try {
    await logout()
    await router.push({ name: 'login' })
  } catch (err) {
    const message = toAuthMessage(err)
    if (message) alert(message)
  }
}
</script>

<template>
  <header>
    <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="125" height="125" />

    <div class="wrapper">
      <h1 class="brand green">Textraordinary</h1>

      <nav v-if="ready">
        <RouterLink to="/">Home</RouterLink>
        <RouterLink to="/about">About</RouterLink>
        <template v-if="user">
          <RouterLink to="/dashboard">Dashboard</RouterLink>
          <RouterLink to="/profile">Profile</RouterLink>
          <button
            class="nav-signout"
            type="button"
            :title="user.email ?? undefined"
            @click="signOut"
          >
            Sign out
          </button>
        </template>
        <RouterLink v-else to="/login">Sign in</RouterLink>
      </nav>
    </div>
  </header>

  <RouterView v-if="ready" />
</template>

<style scoped>
header {
  line-height: 1.5;
  max-height: 100vh;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

.brand {
  font-size: 2.6rem;
  font-weight: 500;
  text-align: center;
}

.nav-signout {
  font: inherit;
  color: hsla(160, 100%, 37%, 1);
  background: none;
  border: 0;
  border-left: 1px solid var(--color-border);
  cursor: pointer;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
  margin-top: 2rem;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a,
.nav-signout {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  .brand {
    text-align: left;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  nav {
    text-align: left;
    margin-left: -1rem;
    font-size: 1rem;

    padding: 1rem 0;
    margin-top: 1rem;
  }
}
</style>
