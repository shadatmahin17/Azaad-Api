const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

const { AUDIO_DIR, COVER_DIR } = require('./src/config/env');

const app = express();

// Enable trust proxy for Render reverse proxy & rate limiting
app.set('trust proxy', 1);

// Ensure local upload directories exist
[AUDIO_DIR, COVER_DIR].forEach((dir) => {
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded media files (support both /uploads/covers and /uploads/cover)
if (AUDIO_DIR) app.use('/uploads/audio', express.static(AUDIO_DIR));
if (COVER_DIR) {
  app.use('/uploads/covers', express.static(COVER_DIR));
  app.use('/uploads/cover', express.static(COVER_DIR));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/songs', require('./src/routes/songs'));
app.use('/api/playlists', require('./src/routes/playlists'));
app.use('/api', require('./src/routes/auth'));
app.use('/api', require('./src/routes/profile'));

// Determine frontend build directory (Vite outputs to /public or /frontend/dist)
const publicDir = path.join(__dirname, 'public');
const frontendDistDir = path.join(__dirname, 'frontend/dist');
const staticDir = fs.existsSync(publicDir)
  ? publicDir
  : fs.existsSync(frontendDistDir)
  ? frontendDistDir
  : null;

// Serve frontend static assets if built
if (staticDir) {
  app.use(express.static(staticDir));
  app.get('*', (req, res, next) => {
    // Pass API or uploaded asset requests to 404 handler
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    const indexPath = path.join(staticDir, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// 404 Handler for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

// Start Server
const PORT = parseInt(process.env.PORT, 10) || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Azaad backend running on http://0.0.0.0:${PORT}`);
});
