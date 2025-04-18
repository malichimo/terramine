// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    target: "esnext",
    minify: "esbuild",
    rollupOptions: {
      onwarn(warning, warn) {
        console.warn(`Rollup warning: ${warning.message}`);
      },
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  preview: {
    allowedHosts: ["terramine.onrender.com"],
  },
});