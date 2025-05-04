import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: true,
  },
  server: {
    hmr: true,
  },
  preview: {
    host: true,      // ← this tells Vite to use 0.0.0.0
    port: 4173       // optional, default
  }
});
