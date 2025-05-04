import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  preview: {
    host: 'terramine.onrender.com',
    allowedHosts: ['terramine.onrender.com', 'localhost'],
  },
});