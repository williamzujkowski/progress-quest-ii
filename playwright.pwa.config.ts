import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e-pwa',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173/progress-quest-ii/',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  webServer: {
    command: 'node scripts/serve-production.mjs',
    url: 'http://127.0.0.1:4173/progress-quest-ii/',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [{ name: 'chromium-pwa', use: { ...devices['Desktop Chrome'] } }],
});
