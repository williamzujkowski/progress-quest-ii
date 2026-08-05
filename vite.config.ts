import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  build: {
    assetsInlineLimit: 0,
  },
  define: {
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA ?? 'development'),
  },
  plugins: [react()],
  test: {
    exclude: ['e2e/**', 'e2e-pwa/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/main.tsx', 'src/__tests__/**'],
      // Floors sit a couple of points under the numbers measured when they were set, so
      // ordinary variance does not redden the gate while a real regression does. Raise them
      // when coverage rises; do not lower them to make a failing run pass.
      //
      // The global figures look modest because `include` counts every src file, including
      // ones no unit test imports — components are exercised by the Playwright suite, which
      // this provider cannot observe. That is deliberate: adding an untested module should
      // move the number down. The engine floor is the one that carries AGENTS.md's rule
      // against writing engine code without a test, and it is set high because the engine
      // genuinely is tested that well.
      thresholds: {
        statements: 80,
        branches: 77,
        functions: 76,
        lines: 82,
        'src/engine/**': {
          statements: 93,
          branches: 86,
          functions: 95,
          lines: 94,
        },
      },
    },
  },
});
