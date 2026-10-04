import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: 'player-names-ui.spec.ts',
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:5379', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 5'], viewport: { width: 320, height: 844 } } },
  ],
  webServer: {
    command: 'pnpm --filter @boardgame/web exec vite --host 127.0.0.1 --port 5379 --strictPort',
    url: 'http://127.0.0.1:5379',
    reuseExistingServer: false,
  },
});
