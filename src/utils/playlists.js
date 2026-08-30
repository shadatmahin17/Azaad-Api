const fs = require('fs');
const { PLAYLISTS_FILE } = require('../config/env');

function readPlaylists() {
  try {
    const raw = fs.readFileSync(PLAYLISTS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

function writePlaylists(playlists) {
  fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2), 'utf8');
}

module.exports = { readPlaylists, writePlaylists };
