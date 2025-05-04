import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    minify: 'esbuild',
    target: 'esnext',
    sourcemap: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.jsx') // ✅ Tell Vite where the entry point is
    }
  },
  server: {
    hmr: true,
  },
});

