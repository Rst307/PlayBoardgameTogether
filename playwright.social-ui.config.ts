import { defineConfig, devices } from '@playwright/test';

// Browser checks use projected HTTP fixtures and never clear a database.
export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'social-shell.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5376', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } } },
  ],
  webServer: {
    command: 'pnpm --filter @boardgame/web exec vite preview --host 127.0.0.1 --port 5376 --strictPort',
    url: 'http://127.0.0.1:5376',
    reuseExistingServer: false,
  },
});
