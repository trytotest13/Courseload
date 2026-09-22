import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks to Vite, and Vite forwards /api to Express.
    // That keeps the browser on one origin and removes CORS from the picture.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/tests/setup.ts'],
    globals: false,
  },
});
