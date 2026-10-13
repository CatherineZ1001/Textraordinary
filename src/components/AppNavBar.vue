<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/auth/useAuth'
import { toAuthMessage } from '@/auth/errors'

// Site-wide top bar: wordmark, page links in a segmented pill, and the account actions.
// On narrow screens the links and actions collapse behind a "Menu" toggle.
const route = useRoute()
const router = useRouter()
const { user, ready, logout } = useAuth()

const menuOpen = ref(false)
watch(
  () => route.fullPath,
  () => (menuOpen.value = false),
)

const links = computed(() => [
  { to: '/practice', label: 'Practice' },
  ...(user.value
    ? [
        { to: '/dashboard', label: 'Dashboard' },
        { to: '/profile', label: 'Profile' },
      ]
    : []),
  { to: '/about', label: 'About' },
])

const initials = computed(() => {
  const source = user.value?.displayName || user.value?.email || '?'
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
})

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
  <header class="bar">
    <div class="inner">
      <RouterLink to="/" class="brand" aria-label="Textraordinary home">
        <span class="mark" aria-hidden="true">
          <svg width="18" height="16" viewBox="0 0 18 16">
            <path
              d="M9 1C4.6 1 1 3.9 1 7.4c0 2 1.2 3.8 3 5l-.7 2.6 3.2-1.6c.8.2 1.6.3 2.5.3 4.4 0 8-2.9 8-6.3S13.4 1 9 1Z"
              fill="currentColor"
            />
          </svg>
        </span>
        Textraordinary
      </RouterLink>

      <button
        class="menu-toggle"
        type="button"
        :aria-expanded="menuOpen"
        aria-controls="site-nav"
        @click="menuOpen = !menuOpen"
      >
        {{ menuOpen ? 'Close' : 'Menu' }}
        <span class="menu-ring" :class="{ open: menuOpen }" aria-hidden="true"></span>
      </button>

      <div id="site-nav" class="panel" :class="{ open: menuOpen }">
        <nav class="links" aria-label="Main">
          <RouterLink v-for="link in links" :key="link.to" :to="link.to" class="link">
            {{ link.label }}
          </RouterLink>
        </nav>

        <div v-if="ready" class="account">
          <template v-if="user">
            <RouterLink
              to="/profile"
              class="avatar"
              :title="user.email ?? undefined"
              aria-label="Your profile"
            >
              {{ initials }}
            </RouterLink>
            <button class="pill pill-ghost" type="button" @click="signOut">Sign out</button>
          </template>
          <template v-else>
            <RouterLink to="/register" class="pill pill-ghost">Create account</RouterLink>
            <RouterLink to="/login" class="pill pill-solid">
              Sign in
              <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true">
                <path
                  d="M1 6h11M7.5 1.5 12 6l-4.5 4.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </RouterLink>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.bar {
  position: sticky;
  top: 0;
  z-index: 50;
  background: color-mix(in srgb, var(--desk) 82%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(23, 32, 42, 0.08);
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

/* Reset the global green link styles from main.css inside the bar. */
.bar a {
  color: inherit;
  transition: none;
}
.bar a:hover {
  background-color: transparent;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--ink);
}

.mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--ios-blue);
  color: #fff;
}

.panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

/* Page links share the look of the practice ModeSwitch segmented control. */
.links {
  display: inline-flex;
  padding: 3px;
  border-radius: 10px;
  background: rgba(23, 32, 42, 0.1);
}

.bar .link {
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  color: var(--desk-ink);
  transition:
    background 0.18s,
    box-shadow 0.18s,
    color 0.18s;
}
.bar .link:hover {
  color: var(--ink);
}
.bar .link.router-link-active {
  background: #fff;
  color: var(--ink);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(23, 32, 42, 0.18);
}

.account {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 999px;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background 0.18s,
    transform 0.18s;
}

.bar .pill-solid {
  background: var(--ink);
  color: #fff;
  border: 0;
}
.bar .pill-solid:hover {
  background: #2b3846;
}
.pill-solid svg {
  transition: transform 0.18s;
}
.pill-solid:hover svg {
  transform: translateX(2px);
}

.bar .pill-ghost {
  background: transparent;
  color: var(--ink);
  border: 1.5px solid rgba(23, 32, 42, 0.22);
}
.bar .pill-ghost:hover {
  background: rgba(23, 32, 42, 0.06);
}

.bar .avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(#a5abb6, #858b96);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.link:focus-visible,
.pill:focus-visible,
.avatar:focus-visible,
.brand:focus-visible,
.menu-toggle:focus-visible {
  outline: 2px solid var(--ios-blue);
  outline-offset: 2px;
}

.menu-toggle {
  display: none;
  margin-left: auto;
  align-items: center;
  gap: 8px;
  padding: 6px 4px;
  border: 0;
  background: none;
  font: inherit;
  font-size: 15px;
  font-weight: 600;
  color: var(--ink);
  cursor: pointer;
}

.menu-ring {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid currentColor;
  border-right-color: transparent;
  transition: transform 0.25s;
}
.menu-ring.open {
  transform: rotate(180deg);
}

@media (max-width: 760px) {
  .inner {
    flex-wrap: wrap;
    padding: 10px 16px;
  }

  .menu-toggle {
    display: inline-flex;
  }

  .panel {
    display: none;
    flex-basis: 100%;
    flex-direction: column;
    align-items: stretch;
    gap: 16px;
    padding: 8px 0 12px;
  }
  .panel.open {
    display: flex;
  }

  .links {
    flex-direction: column;
  }
  .bar .link {
    padding: 10px 14px;
  }

  .account {
    justify-content: space-between;
  }
}
</style>
