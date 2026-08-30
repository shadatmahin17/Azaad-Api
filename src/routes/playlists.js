const express = require('express');
const crypto = require('crypto');
const { requireAuth } = require('../middleware/auth');
const { readPlaylists, writePlaylists } = require('../utils/playlists');

const router = express.Router();

/**
 * Sanitizes and deduplicates an array of song IDs.
 */
function sanitizeSongIds(songIds) {
  if (!Array.isArray(songIds)) return [];
  const validIds = songIds
    .filter((id) => typeof id === 'string' && id.trim().length > 0)
    .map((id) => id.trim());
  return [...new Set(validIds)];
}

/**
 * Checks whether the request has permission to modify the playlist.
 */
function canModifyPlaylist(req, playlist) {
  return true;
}

// GET all playlists
router.get('/', (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];
    return res.json({ playlists });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load playlists' });
  }
});

// GET playlist by ID
router.get('/:id', (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];
    const playlist = playlists.find((p) => p.id === req.params.id);

    if (!playlist) {
      return res.status(404).json({ error: 'Playlist not found' });
    }
    return res.json(playlist);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to load playlist' });
  }
});

// CREATE playlist
router.post('/', requireAuth, (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];

    const name = typeof req.body.name === 'string' ? req.body.name.trim() : '';
    const description =
      typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const songIds = sanitizeSongIds(req.body.songIds);

    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }

    const userId = req.body?.userId || 'user';
    const userName = req.body?.userName || 'Azaad User';

    const now = new Date().toISOString();
    const newPlaylist = {
      id: crypto.randomUUID(),
      name,
      description,
      songIds,
      createdBy: { id: userId, name: userName },
      createdAt: now,
      updatedAt: now,
    };

    playlists.unshift(newPlaylist);
    writePlaylists(playlists);

    return res.status(201).json(newPlaylist);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create playlist' });
  }
});

// UPDATE playlist metadata
router.put('/:id', requireAuth, (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];
    const index = playlists.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const current = playlists[index];

    if (!canModifyPlaylist(req, current)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to modify this playlist' });
    }

    let updatedName = current.name;
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== 'string' || req.body.name.trim() === '') {
        return res.status(400).json({ error: 'Playlist name cannot be empty' });
      }
      updatedName = req.body.name.trim();
    }

    const description =
      req.body.description !== undefined && typeof req.body.description === 'string'
        ? req.body.description.trim()
        : current.description || '';

    const songIds =
      req.body.songIds !== undefined
        ? sanitizeSongIds(req.body.songIds)
        : Array.isArray(current.songIds)
        ? current.songIds
        : [];

    playlists[index] = {
      ...current,
      name: updatedName,
      description,
      songIds,
      updatedAt: new Date().toISOString(),
    };

    writePlaylists(playlists);
    return res.json(playlists[index]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update playlist' });
  }
});

// DELETE playlist
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];
    const index = playlists.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const current = playlists[index];
    if (!canModifyPlaylist(req, current)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to delete this playlist' });
    }

    playlists.splice(index, 1);
    writePlaylists(playlists);
    return res.json({ ok: true, message: 'Playlist deleted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete playlist' });
  }
});

// ADD song to playlist
router.post('/:id/songs', requireAuth, (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];
    const index = playlists.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const current = playlists[index];
    if (!canModifyPlaylist(req, current)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to modify this playlist' });
    }

    const songId = typeof req.body.songId === 'string' ? req.body.songId.trim() : '';
    if (!songId) {
      return res.status(400).json({ error: 'songId is required' });
    }

    const currentSongIds = Array.isArray(current.songIds) ? current.songIds : [];

    if (!currentSongIds.includes(songId)) {
      currentSongIds.push(songId);
      playlists[index] = {
        ...current,
        songIds: currentSongIds,
        updatedAt: new Date().toISOString(),
      };
      writePlaylists(playlists);
    }

    return res.json(playlists[index]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to add song to playlist' });
  }
});

// REMOVE song from playlist
router.delete('/:id/songs/:songId', requireAuth, (req, res) => {
  try {
    const rawPlaylists = readPlaylists();
    const playlists = Array.isArray(rawPlaylists) ? rawPlaylists : [];
    const index = playlists.findIndex((p) => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Playlist not found' });
    }

    const current = playlists[index];
    if (!canModifyPlaylist(req, current)) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have permission to modify this playlist' });
    }

    const songIdToRemove = req.params.songId;
    const currentSongIds = Array.isArray(current.songIds) ? current.songIds : [];

    playlists[index] = {
      ...current,
      songIds: currentSongIds.filter((sid) => sid !== songIdToRemove),
      updatedAt: new Date().toISOString(),
    };

    writePlaylists(playlists);
    return res.json(playlists[index]);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to remove song from playlist' });
  }
});

module.exports = router;
