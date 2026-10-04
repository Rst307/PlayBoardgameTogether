import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e', testMatch: 'rummikub-package-ui.spec.ts', workers: 1,
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 950 } } },
    { name: 'laptop', use: { viewport: { width: 1280, height: 720 } } },
    { name: 'mobile', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'small-mobile', use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true } },
  ],
});
