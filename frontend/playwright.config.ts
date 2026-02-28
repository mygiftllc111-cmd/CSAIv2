import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3247',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'VITE_USE_MOCK=true npm run dev',
    port: 3247,
    reuseExistingServer: !process.env.CI,
  },
});
