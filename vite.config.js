// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure CommonJS compatibility
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    // Target modern browsers
    target: "esnext",
    // Minify output
    minify: "esbuild",
  },
  resolve: {
    alias: {
      // Ensure consistent module resolution
      "@": "/src",
    },
  },
});
