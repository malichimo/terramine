import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './', // ensures relative paths are used for deployment
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
    host: 'terramine.onrender.com',
    allowedHosts: ['terramine.onrender.com', 'localhost'],
  }
});
