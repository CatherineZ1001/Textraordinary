import { defineConfig, devices } from '@playwright/test'

// End-to-end tests for the manual test cases (TC-UA-01, TC-SR-01, TC-CR-01).
// Run with `npm run test:e2e`, which starts the Firebase emulators first; see e2e/global-setup.ts.
// The app is built with `--mode test` (.env.test), so it talks to the emulators, and each test
// mocks the NaviGator AI request, so no real Firebase project or API key is used.
const PORT = 4173

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    // Shows the scenario's messages at once instead of animating them in one by one
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  // Desktop width, so the nav links aren't collapsed behind the "Menu" toggle
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `npx vite build --mode test --outDir dist-e2e && npx vite preview --mode test --outDir dist-e2e --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
