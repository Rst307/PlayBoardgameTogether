import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, mode }) => {
  const building = command === 'build';
  const env = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');
  // Local .env may select development for the API; a web build is always production.
  if (building) process.env.NODE_ENV = 'production';
  const apiTarget = env.E2E_API_TARGET || 'http://127.0.0.1:3001';
  return {
    envDir: '../..',
    plugins: [react()],
    define: building ? { 'import.meta.env.DEV': false, 'import.meta.env.PROD': true } : {},
    resolve: { alias: building ? {
      '../pages/LabPage.js': fileURLToPath(new URL('./src/pages/LabDisabled.tsx', import.meta.url)),
      '../dev/UiScenes.js': fileURLToPath(new URL('./src/pages/UiScenesDisabled.tsx', import.meta.url)),
    } : {} },
    server: { port: 5173, proxy: { '/api': { target: apiTarget, ws: true }, '/health': apiTarget } },
    build: { sourcemap: true },
  };
});
