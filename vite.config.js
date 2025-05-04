import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    minify: 'esbuild', // Use esbuild to minimize eval usage
    target: 'esnext',
    sourcemap: true,
  },
  server: {
    hmr: true,
  },
  preview: {
    host: 'terramine.onrender.com', // Allow Render host
    allowedHosts: ['terramine.onrender.com', 'localhost'], // Explicitly allow these hosts
  },
});