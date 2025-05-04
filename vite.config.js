import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Use ES Module export syntax
export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: true,
  },
  server: {
    hmr: true,
  },
});