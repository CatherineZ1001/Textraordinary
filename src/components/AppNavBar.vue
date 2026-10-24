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

// On the practice view the bar turns powder blue, framing that page's white panel
const tinted = computed(() => route.name === 'practice')
// On the scenario list the bar is plain white with no divider, blending into that page's white frame
const plain = computed(() => route.name === 'scenarios')

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
  <header class="bar" :class="{ tinted, plain }">
    <div class="inner">
      <RouterLink to="/" class="brand" aria-label="Textraordinary home">
        <!-- the splash screen's lime logo on a navy tile (icy blue on white on the practice view) -->
        <span class="mark" aria-hidden="true">
          <svg viewBox="-5 -3 110 106" width="22" height="22">
            <path
              d="M50 4 C76 4 96 22 96 46 C96 70 76 88 50 88 C44 88 38 87 33 85 L12 96 L17 77 C9 69 4 58 4 46 C4 22 24 4 50 4 Z M50 18 C69 18 82 30 82 46 C82 62 69 74 50 74 C31 74 18 62 18 46 C18 30 31 18 50 18 Z"
              fill-rule="evenodd"
            />
            <path d="M31 30 H69 V41 H55.5 V64 H44.5 V41 H31 Z" />
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
  background: color-mix(in srgb, var(--white) 92%, transparent);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid var(--line);
}

.inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  gap: 24px;
}

/* Reset the global link styles from main.css inside the bar. */
.bar a {
  color: inherit;
  text-decoration: none;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--navy);
}

.mark {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--navy);
  color: var(--lime);
}
.mark svg {
  display: block;
  fill: currentColor;
}

.panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

/* Plain text links; the current page is darker with a small lime marker underneath */
.links {
  display: inline-flex;
  gap: 4px;
}

.bar .link {
  position: relative;
  padding: 6px 12px;
  font-size: 15px;
  font-weight: 500;
  color: var(--muted);
  transition: color 0.18s;
}
.bar .link:hover {
  color: var(--navy);
}
.bar .link.router-link-active {
  color: var(--navy);
}
/* Scenario list: solid white, no divider */
.bar.plain {
  background: var(--white);
  border-bottom-color: transparent;
}

/* Practice view: only white and icy blue, no navy or lime fills */
.bar.tinted {
  background: var(--powder);
  border-bottom-color: transparent;
}
.bar.tinted .mark {
  background: var(--white);
  color: var(--icy-deep);
}
.bar.tinted .link.router-link-active::after {
  background: var(--white);
}
.bar.tinted .pill-ghost {
  border-color: rgba(255, 255, 255, 0.8);
}
.bar.tinted .pill-solid,
.bar.tinted .avatar {
  background: var(--white);
  color: var(--navy);
}
.bar.tinted .pill-solid:hover {
  background: var(--powder-soft);
}

.bar .link.router-link-active::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -2px;
  height: 3px;
  border-radius: 3px;
  background: var(--lime);
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
  background: var(--navy);
  color: var(--lime);
  border: 0;
}
.bar .pill-solid:hover {
  background: var(--navy-soft);
}
.pill-solid svg {
  transition: transform 0.18s;
}
.pill-solid:hover svg {
  transform: translateX(2px);
}

.bar .pill-ghost {
  background: transparent;
  color: var(--navy);
  border: 1.5px solid var(--line);
}
.bar .pill-ghost:hover {
  border-color: var(--navy);
}

.bar .avatar {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--lime);
  color: var(--navy);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
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
  color: var(--navy);
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
    padding: 10px 4px;
  }
  .bar .link.router-link-active::after {
    left: -10px;
    right: auto;
    top: 50%;
    bottom: auto;
    width: 4px;
    height: 18px;
    transform: translateY(-50%);
  }

  .account {
    justify-content: space-between;
  }
}
</style>
