import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'gomoku-package-ui.spec.ts',
  workers: 1,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1100, height: 950 } } },
    { name: 'mobile', use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
});
