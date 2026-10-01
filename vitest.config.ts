import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { fileParallelism: false, include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'], exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'] } });
