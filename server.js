// server.js - Entry point for hosting platforms like Render, Railway, and Docker
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distServerEsm = path.join(__dirname, 'dist', 'server.js');
const distServerCjs = path.join(__dirname, 'dist', 'server.cjs');

if (fs.existsSync(distServerEsm)) {
  await import('./dist/server.js');
} else if (fs.existsSync(distServerCjs)) {
  await import('./dist/server.cjs');
} else {
  console.error('Error: Production server build not found. Please run "npm run build" first.');
  process.exit(1);
}
