import { defineConfig } from '@playwright/test';
import publicPreview from './playwright.developers.config.js';

export default defineConfig({
  ...publicPreview,
  testMatch: ['social-shell.spec.ts', 'public-chat.spec.ts', 'navigation-menu.spec.ts', 'developers.spec.ts'],
});
