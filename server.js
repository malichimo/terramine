// server.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// ✅ DEV ONLY: Relaxed CSP header to allow eval() for tools like Vite or Firebase
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self';
     script-src 'self' 'unsafe-eval' 'unsafe-inline' https://maps.googleapis.com https://maps.gstatic.com;
     style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
     font-src 'self' https://fonts.gstatic.com;
     img-src 'self' data: https:;
     connect-src 'self' https:;
     frame-src 'self' https:;`
  );
  next();
});

// Serve static files from dist/
app.use(express.static(path.resolve(__dirname, 'dist')));

// Fallback to index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
});

app.listen(port, () => {
  console.log(`✅ Server running on http://localhost:${port}`);
});
