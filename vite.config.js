import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild', // Use esbuild for better CSP compatibility
    target: 'esnext',
    sourcemap: true,
  },
  server: {
    hmr: true,
  },
});