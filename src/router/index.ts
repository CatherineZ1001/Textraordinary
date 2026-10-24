import { createRouter, createWebHistory } from 'vue-router'
import PracticeView from '../views/PracticeView.vue'
import { auth } from '@/firebase'
import { authReady, onSessionLost } from '@/auth/useAuth'

declare module 'vue-router' {
  interface RouteMeta {
    /** Only signed-in users may visit; others are sent to the login page. */
    requiresAuth?: boolean
    /** Only signed-out users may visit (login, register); signed-in users go to the dashboard. */
    guestOnly?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // Until the real home page exists, send visitors to the practice page.
      path: '/',
      redirect: '/practice',
    },
    {
      // Nested so the "Practice" nav link stays highlighted while playing a scenario
      path: '/practice',
      children: [
        {
          path: '',
          name: 'scenarios',
          component: () => import('../views/ScenarioListView.vue'),
        },
        {
          path: ':id',
          name: 'practice',
          component: PracticeView,
          props: true,
        },
      ],
    },
    {
      path: '/about',
      name: 'about',
      // route level code-splitting
      // this generates a separate chunk (About.[hash].js) for this route
      // which is lazy-loaded when the route is visited.
      component: () => import('../views/AboutView.vue'),
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/RegisterView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/forgot-password',
      name: 'forgot-password',
      component: () => import('../views/ForgotPasswordView.vue'),
      meta: { guestOnly: true },
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

router.beforeEach(async (to) => {
  await authReady
  const signedIn = auth.currentUser !== null

  if (to.meta.requiresAuth && !signedIn) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.meta.guestOnly && signedIn) {
    return { name: 'dashboard' }
  }
})

onSessionLost(() => {
  const current = router.currentRoute.value
  if (current.meta.requiresAuth) {
    void router.replace({ name: 'login', query: { expired: '1', redirect: current.fullPath } })
  }
})

/** Returns the redirect target from a query value if it is a path inside this app, otherwise the dashboard. */
export function safeRedirect(target: unknown): string {
  if (
    typeof target === 'string' &&
    target.startsWith('/') &&
    !target.startsWith('//') &&
    !target.startsWith('/\\')
  ) {
    return target
  }
  return '/dashboard'
}

export default router
