import { defineConfig } from '@playwright/test';
import publicPreview from './playwright.developers.config.js';

// UI fixtures validate the production frontend without provisioning a database.
export default defineConfig({ ...publicPreview, testMatch: 'public-chat.spec.ts' });
