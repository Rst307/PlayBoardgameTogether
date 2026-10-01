import { build } from 'vite';
import process from 'node:process';

// Set before Vite resolves .env so an API development setting cannot select React's development runtime.
process.env.NODE_ENV = 'production';
await build();
