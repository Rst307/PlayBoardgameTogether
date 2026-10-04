import { defineConfig } from '@playwright/test';
import preview from './playwright.developers.config.js';
export default defineConfig({ ...preview, testMatch: 'game-package-upload-ui.spec.ts' });
