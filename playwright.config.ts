import { createServer } from 'node:net';
import { defineConfig, devices } from '@playwright/test';

// Each invocation owns its own server on its own port. Reusing whatever answers on a fixed
// port meant two things: concurrent runs fought over ownership and the shorter one's exit
// killed the longer one (#182), and — worse — Playwright's reuse check only asks "is something
// answering here", not "is this the app at this commit". A stale dev server from another branch
// has the same title and DOM, so the whole suite could go green against code it never built.
const reservePort = () => new Promise<number>((resolve, reject) => {
  const probe = createServer();
  probe.unref();
  probe.on('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = probe.address();
    const chosen = typeof address === 'object' && address ? address.port : 0;
    probe.close(() => (chosen ? resolve(chosen) : reject(new Error('Could not reserve a port for the dev server.'))));
  });
});

// Playwright re-evaluates this config inside every worker process, so the reservation has to
// happen exactly once and then be inherited — otherwise each worker invents its own port and
// navigates somewhere no server is listening. Specs read the same variable for the origin they
// need at module scope (storage-state fixtures, explicit newContext calls).
const inherited = process.env.E2E_BASE_URL;
const port = inherited ? Number(new URL(inherited).port) : await reservePort();
const baseURL = inherited ?? `http://localhost:${port}`;
process.env.E2E_BASE_URL = baseURL;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    // --strictPort makes a taken port fail loudly instead of silently sliding to another one.
    command: `npm run dev -- --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
