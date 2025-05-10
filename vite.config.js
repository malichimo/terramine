export default {
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  preview: {
  allowedHosts: ['terramine.onrender.com'],
},
  build: {
    target: 'esnext',
  },
};

