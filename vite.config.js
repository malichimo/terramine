import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',  
    port: 10000, // Change this to an available port
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 10000,
    allowedHosts: ['terramine.onrender.com'] // 👈 Add your Render domain here
  }
});
