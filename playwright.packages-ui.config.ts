import { defineConfig } from '@playwright/test';
import preview from './playwright.developers.config.js';
export default defineConfig({
  ...preview,
  testMatch: ['game-package-upload-ui.spec.ts', 'admin-games-ui.spec.ts'],
  use: { ...preview.use, baseURL: 'http://127.0.0.1:5381' },
  webServer: {
    command: 'pnpm --filter @boardgame/web exec vite preview --host 127.0.0.1 --port 5381 --strictPort',
    url: 'http://127.0.0.1:5381/admin/catalog',
    reuseExistingServer: false,
  },
});
