import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  define: {
    __BUILD_ID__: JSON.stringify(process.env.GITHUB_SHA ?? 'development'),
  },
  plugins: [react()],
  test: {
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
