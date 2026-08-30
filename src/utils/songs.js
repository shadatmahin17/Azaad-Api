const fs = require('fs');
const path = require('path');
const { SONGS_FILE, LEGACY_SONGS_FILE } = require('../config/env');

function readSongs() {
  try {
    if (fs.existsSync(SONGS_FILE)) {
      const raw = fs.readFileSync(SONGS_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    // Fallback to legacy file location if present
    if (LEGACY_SONGS_FILE && fs.existsSync(LEGACY_SONGS_FILE)) {
      const rawLegacy = fs.readFileSync(LEGACY_SONGS_FILE, 'utf8');
      const parsedLegacy = JSON.parse(rawLegacy);
      if (Array.isArray(parsedLegacy) && parsedLegacy.length > 0) {
        // Automatically sync to primary file
        writeSongs(parsedLegacy);
        return parsedLegacy;
      }
    }
  } catch (err) {
    console.error('Error reading songs store:', err);
  }
  return [];
}

function writeSongs(songs) {
  try {
    const parentDir = path.dirname(SONGS_FILE);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(SONGS_FILE, JSON.stringify(songs, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing songs store:', err);
  }
}

module.exports = { readSongs, writeSongs };
