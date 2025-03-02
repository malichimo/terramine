import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  // Required for Render
    port: 10000,       // Render requires explicit port binding
    strictPort: true,
  },
  preview: {
    port: 10000,  // Ensure preview mode works
    host: '0.0.0.0'
  }
});

