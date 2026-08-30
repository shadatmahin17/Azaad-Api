const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separator = trimmed.indexOf('=');
    if (separator < 1) return;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const defaultEnvPath = path.join(ROOT_DIR, '.env');
const exampleEnvPath = path.join(ROOT_DIR, '.env.example');

if (fs.existsSync(defaultEnvPath)) {
  loadEnvFile(defaultEnvPath);
} else if (fs.existsSync(exampleEnvPath)) {
  loadEnvFile(exampleEnvPath);
}

function getEnv(name, fallback = '') {
  return process.env[name] || fallback;
}

const PORT = parseInt(process.env.PORT, 10) || 3000;
const API_KEY = getEnv('ADMIN_API_KEY', 'azaad-admin-secret-key');
const ADMIN_USERNAME = getEnv('ADMIN_USERNAME', 'admin');
const ADMIN_PASSWORD = getEnv('ADMIN_PASSWORD', 'admin123');

const CATEGORY_OPTIONS = ['Hindi', 'Bangla', 'English', 'Nasheed', 'Sura', 'Electronic', 'Pop', 'Hip-Hop', 'Chill', 'Other'];

const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : null;
const UPLOADS_DIR = path.join(ROOT_DIR, 'uploads');
const AUDIO_DIR = path.join(UPLOADS_DIR, 'audio');
const COVER_DIR = path.join(UPLOADS_DIR, 'covers');
const SONGS_FILE = process.env.SONGS_FILE
  ? path.resolve(process.env.SONGS_FILE)
  : DATA_DIR
    ? path.join(DATA_DIR, 'songs.json')
    : path.join(ROOT_DIR, 'songs.json');
const PLAYLISTS_FILE = process.env.PLAYLISTS_FILE
  ? path.resolve(process.env.PLAYLISTS_FILE)
  : DATA_DIR
    ? path.join(DATA_DIR, 'playlists.json')
    : path.join(ROOT_DIR, 'playlists.json');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  : [];

module.exports = {
  ROOT_DIR,
  PORT,
  API_KEY,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  CATEGORY_OPTIONS,
  DATA_DIR,
  UPLOADS_DIR,
  AUDIO_DIR,
  COVER_DIR,
  SONGS_FILE,
  PLAYLISTS_FILE,
  PUBLIC_DIR,
  ALLOWED_ORIGINS,
};
