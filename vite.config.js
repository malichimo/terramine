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
    host: true,
    port: 4173,
    allowedHosts: ['terramine.onrender.com'], // ✅ Add your Render domain
  },
});
