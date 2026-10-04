import { defineConfig } from '@playwright/test';
import preview from './playwright.developers.config.js';
export default defineConfig({ ...preview, testMatch: 'admin-updates-ui.spec.ts' });
