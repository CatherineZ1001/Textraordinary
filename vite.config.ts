import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Requests to /api/navigator/* are forwarded to UF's NaviGator Toolkit (OpenAI-compatible).
// The API key comes from NAVIGATOR_API_KEY (OS environment variable, or .env.local) and is
// attached here, on the dev server, so it is never bundled into or visible to the browser.
// Do not give it a VITE_ prefix: Vite would then ship it to the browser.
const navigatorProxy = (apiKey: string | undefined): ProxyOptions => ({
  target: 'https://api.ai.it.ufl.edu/v1',
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/navigator/, ''),
  configure: (proxy) => {
    proxy.on('proxyReq', (proxyReq) => {
      if (apiKey) proxyReq.setHeader('Authorization', `Bearer ${apiKey}`)
      else console.warn('[navigator] NAVIGATOR_API_KEY is not set; AI requests will fail.')
    })
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // '' loads every variable from the .env files, not just VITE_ ones; this stays in Node
  const apiKey = process.env.NAVIGATOR_API_KEY || loadEnv(mode, process.cwd(), '').NAVIGATOR_API_KEY
  const proxy = { '/api/navigator': navigatorProxy(apiKey) }

  return {
    plugins: [
      vue(),
      vueDevTools(),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: { proxy },
    preview: { proxy },
  }
})
